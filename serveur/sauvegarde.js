// ============================================================================
//  SAUVEGARDES DE LA BASE
//
//  Ce qui est fait à chaque sauvegarde :
//   1. copie cohérente de la base en mémoire (db.serialize), sans arrêter le site ;
//   2. contrôle d'intégrité SQLite de la copie (PRAGMA integrity_check) ;
//   3. chiffrement AES-256-GCM si SAUVEGARDE_CLE est définie (clé dérivée par scrypt,
//      sel et IV aléatoires, toute modification du fichier est détectée) ;
//   4. relecture : le fichier chiffré est déchiffré en mémoire et son empreinte SHA-256
//      comparée à l'original ;
//   5. écriture atomique (fichier temporaire + fsync + renommage), droits 600, dossier 700 ;
//   6. un manifeste JSON (date, raison, SHA-256, taille…) accompagne chaque fichier ;
//   7. rotation : on garde les N dernières sauvegardes de chaque type.
//
//  Il n'existe AUCUN moyen de télécharger une sauvegarde depuis le web : la restauration se
//  fait uniquement en ligne de commande, site arrêté (voir serveur/outils/sauvegardes.js).
// ============================================================================
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const MAGIE = Buffer.from('ATLSAUV1'); // en-tête des fichiers chiffrés
const PARAMS_SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const NOM_VALIDE = /^atelier_\d{8}-\d{6}-\d{3}_(auto|manuel|avant-migration|avant-restauration)\.sqlite(\.chiffre)?$/;
const A_GARDER = { auto: 14, manuel: 10, 'avant-migration': 5, 'avant-restauration': 5 };

export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

// --- Chiffrement --------------------------------------------------------------
function deriverCle(phrase, sel) {
  return crypto.scryptSync(phrase, sel, 32, PARAMS_SCRYPT);
}

export function chiffrer(clair, phrase) {
  const sel = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const chiffreur = crypto.createCipheriv('aes-256-gcm', deriverCle(phrase, sel), iv);
  chiffreur.setAAD(MAGIE);
  const donnees = Buffer.concat([chiffreur.update(clair), chiffreur.final()]);
  return Buffer.concat([MAGIE, sel, iv, chiffreur.getAuthTag(), donnees]);
}

export function dechiffrer(contenu, phrase) {
  if (contenu.length < 52 || !contenu.subarray(0, 8).equals(MAGIE)) throw new Error('Ce fichier n’est pas une sauvegarde chiffrée de l’Atelier.');
  if (!phrase) throw new Error('Cette sauvegarde est chiffrée : il faut SAUVEGARDE_CLE pour la lire.');
  const sel = contenu.subarray(8, 24);
  const iv = contenu.subarray(24, 36);
  const tag = contenu.subarray(36, 52);
  const dechiffreur = crypto.createDecipheriv('aes-256-gcm', deriverCle(phrase, sel), iv);
  dechiffreur.setAAD(MAGIE);
  dechiffreur.setAuthTag(tag);
  try {
    return Buffer.concat([dechiffreur.update(contenu.subarray(52)), dechiffreur.final()]);
  } catch {
    throw new Error('Impossible de déchiffrer : mauvaise clé SAUVEGARDE_CLE, ou fichier abîmé/modifié.');
  }
}

/** Ouvre une copie de base en mémoire et vérifie qu'elle est saine. Renvoie quelques chiffres. */
export function verifierBase(buf) {
  let db;
  try {
    // Une base en mode WAL porte ce mode dans son en-tête (octets 18-19 = 2) et ne peut pas
    // s'ouvrir telle quelle en mémoire : on vérifie une COPIE remise en mode classique (1).
    const copie = Buffer.from(buf);
    if (copie.length > 20 && copie[18] === 2 && copie[19] === 2) copie[18] = copie[19] = 1;
    db = new Database(copie);
  } catch {
    throw new Error('Le fichier n’est pas une base SQLite valide.');
  }
  try {
    const integrite = db.pragma('integrity_check', { simple: true });
    if (integrite !== 'ok') throw new Error(`Base abîmée : ${integrite}`);
    const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((t) => t.name));
    for (const t of ['eleves', 'projets', 'progression']) if (!tables.has(t)) throw new Error(`Ce n’est pas une base de l’Atelier (table « ${t} » absente).`);
    return { eleves: db.prepare('SELECT COUNT(*) AS n FROM eleves').get().n, schema: db.pragma('user_version', { simple: true }) };
  } finally {
    db.close();
  }
}

// --- Écriture sûre ------------------------------------------------------------
function ecrireAtomique(fichier, contenu) {
  const temporaire = path.join(path.dirname(fichier), `.${path.basename(fichier)}.${process.pid}.tmp`);
  const fd = fs.openSync(temporaire, 'wx', 0o600); // « wx » : échoue si le fichier existe (pas d'écrasement, pas de lien piégé)
  try {
    fs.writeSync(fd, contenu);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(temporaire, fichier);
  try {
    const dossier = fs.openSync(path.dirname(fichier), 'r');
    fs.fsyncSync(dossier);
    fs.closeSync(dossier);
  } catch {
    /* certains systèmes de fichiers ne permettent pas de synchroniser un dossier */
  }
}

function horodatage(date = new Date()) {
  const z = (n, l = 2) => String(n).padStart(l, '0');
  return `${date.getUTCFullYear()}${z(date.getUTCMonth() + 1)}${z(date.getUTCDate())}-${z(date.getUTCHours())}${z(date.getUTCMinutes())}${z(date.getUTCSeconds())}-${z(date.getUTCMilliseconds(), 3)}`;
}

/** Vérifie qu'un nom de fichier désigne bien une sauvegarde DANS le dossier (pas de « ../ », pas de lien). */
export function cheminSauvegarde(dossier, nom) {
  const base = path.basename(String(nom || ''));
  if (base !== nom || !NOM_VALIDE.test(base)) throw new Error(`Nom de sauvegarde invalide : « ${nom} ».`);
  const chemin = path.join(dossier, base);
  const infos = fs.lstatSync(chemin, { throwIfNoEntry: false });
  if (!infos) throw new Error(`Sauvegarde introuvable : ${base}`);
  if (!infos.isFile()) throw new Error('Ce n’est pas un fichier ordinaire (lien symbolique refusé).');
  return chemin;
}

// ============================================================================
export function creerSauvegardes({ dossier, cle = '', journal = console }) {
  const etat = { derniere: null, derniereErreur: null, enCours: false };

  function preparerDossier() {
    fs.mkdirSync(dossier, { recursive: true, mode: 0o700 });
    try {
      fs.chmodSync(dossier, 0o700);
    } catch {
      /* dossier monté qui n'appartient pas à l'application : on continue */
    }
    fs.accessSync(dossier, fs.constants.W_OK);
  }

  function liste() {
    let noms = [];
    try {
      noms = fs.readdirSync(dossier).filter((n) => NOM_VALIDE.test(n));
    } catch {
      return [];
    }
    return noms
      .map((nom) => {
        let manifeste = {};
        try {
          manifeste = JSON.parse(fs.readFileSync(path.join(dossier, `${nom}.json`), 'utf8'));
        } catch {
          /* manifeste absent : on affiche quand même le fichier */
        }
        const infos = fs.statSync(path.join(dossier, nom));
        return {
          nom,
          raison: NOM_VALIDE.exec(nom)[1],
          chiffre: nom.endsWith('.chiffre'),
          taille: infos.size,
          date: manifeste.date ? Date.parse(manifeste.date) : infos.mtimeMs,
          eleves: manifeste.eleves ?? null,
          sha256: manifeste.sha256 ?? null,
        };
      })
      .sort((a, b) => b.date - a.date);
  }

  function rotation() {
    const parRaison = {};
    for (const s of liste()) (parRaison[s.raison] ??= []).push(s);
    for (const [raison, sauvegardes] of Object.entries(parRaison)) {
      for (const s of sauvegardes.slice(A_GARDER[raison] ?? 10)) {
        fs.rmSync(path.join(dossier, s.nom), { force: true });
        fs.rmSync(path.join(dossier, `${s.nom}.json`), { force: true });
      }
    }
  }

  /** Sauvegarde à partir d'une base ouverte (better-sqlite3). */
  function sauvegarder(db, raison = 'manuel') {
    if (!A_GARDER[raison]) throw new Error('Raison de sauvegarde inconnue.');
    if (etat.enCours) throw new Error('Une sauvegarde est déjà en cours.');
    etat.enCours = true;
    try {
      preparerDossier();
      const clair = db.serialize();
      const { eleves, schema } = verifierBase(clair);
      const empreinte = sha256(clair);
      let contenu = clair;
      if (cle) {
        contenu = chiffrer(clair, cle);
        // Relecture immédiate : on ne garde jamais une sauvegarde qu'on ne sait pas relire.
        if (sha256(dechiffrer(contenu, cle)) !== empreinte) throw new Error('Vérification du chiffrement échouée.');
      }
      const date = new Date();
      const nom = `atelier_${horodatage(date)}_${raison}.sqlite${cle ? '.chiffre' : ''}`;
      ecrireAtomique(path.join(dossier, nom), contenu);
      ecrireAtomique(
        path.join(dossier, `${nom}.json`),
        JSON.stringify({ date: date.toISOString(), raison, chiffre: Boolean(cle), sha256: empreinte, sha256Fichier: sha256(contenu), taille: contenu.length, eleves, schema }, null, 2),
      );
      rotation();
      etat.derniere = { nom, date: date.getTime(), raison, taille: contenu.length };
      etat.derniereErreur = null;
      journal.log?.(`💾 Sauvegarde ${raison} : ${nom} (${eleves} élève(s))`);
      return etat.derniere;
    } catch (e) {
      etat.derniereErreur = { message: e.message, date: Date.now() };
      journal.error?.(`❌ Sauvegarde ${raison} impossible : ${e.message}`);
      throw e;
    } finally {
      etat.enCours = false;
    }
  }

  /** Lit et vérifie une sauvegarde. Renvoie la base en clair (Buffer). */
  function lire(nom) {
    const chemin = cheminSauvegarde(dossier, nom);
    const contenu = fs.readFileSync(chemin);
    try {
      const manifeste = JSON.parse(fs.readFileSync(`${chemin}.json`, 'utf8'));
      if (manifeste.sha256Fichier && manifeste.sha256Fichier !== sha256(contenu)) throw new Error('Le fichier a été modifié depuis la sauvegarde (empreinte différente).');
    } catch (e) {
      if (e.message.includes('empreinte')) throw e;
    }
    const clair = nom.endsWith('.chiffre') ? dechiffrer(contenu, cle) : contenu;
    const infos = verifierBase(clair);
    return { clair, ...infos };
  }

  function resume() {
    const toutes = liste();
    const derniereAuto = toutes.find((s) => s.raison === 'auto');
    return {
      chiffrement: Boolean(cle),
      nombre: toutes.length,
      tailleTotale: toutes.reduce((t, s) => t + s.taille, 0),
      derniere: toutes[0] ? { nom: toutes[0].nom, date: toutes[0].date, raison: toutes[0].raison } : null,
      derniereAuto: derniereAuto?.date ?? null,
      erreur: etat.derniereErreur,
    };
  }

  /** Sauvegarde automatique : vérifie toutes les heures, sauvegarde si la dernière date de plus de 23 h. */
  function planifier(db, { surErreur } = {}) {
    const verifier = () => {
      const derniere = resume().derniereAuto;
      if (derniere && Date.now() - derniere < 23 * 3600 * 1000) return;
      try {
        sauvegarder(db, 'auto');
      } catch (e) {
        surErreur?.(e);
      }
    };
    const premier = setTimeout(verifier, 60 * 1000);
    const minuterie = setInterval(verifier, 3600 * 1000);
    premier.unref();
    minuterie.unref();
    return () => {
      clearTimeout(premier);
      clearInterval(minuterie);
    };
  }

  return { sauvegarder, liste, lire, resume, planifier, dossier };
}
