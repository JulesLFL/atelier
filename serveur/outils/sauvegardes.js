#!/usr/bin/env node
// ============================================================================
//  Outil des sauvegardes (en ligne de commande uniquement)
//
//    node serveur/outils/sauvegardes.js liste
//    node serveur/outils/sauvegardes.js maintenant
//    node serveur/outils/sauvegardes.js verifier   <nom-du-fichier>
//    node serveur/outils/sauvegardes.js restaurer  <nom-du-fichier>
//
//  Dans Docker (voir le README, section « Sauvegardes et restauration ») :
//    docker exec atelier node serveur/outils/sauvegardes.js liste
//    docker stop atelier
//    docker run --rm --volumes-from atelier -e SAUVEGARDE_CLE="$CLE" atelier:latest \
//      node serveur/outils/sauvegardes.js restaurer <nom>
//    docker start atelier
//
//  L'outil n'a besoin que de DATA_DIR, SAUVEGARDE_DOSSIER (déjà dans l'image) et SAUVEGARDE_CLE.
// ============================================================================
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { RACINE } from '../config.js';
import { creerSauvegardes } from '../sauvegarde.js';
import { serveurActif } from '../verrou.js';

const [commande, nom, option] = process.argv.slice(2);
const FICHIER_BASE = 'atelier.db';

function quitter(message, code = 1) {
  (code ? console.error : console.log)(message);
  process.exit(code);
}

const config = {
  dossierDonnees: path.resolve(RACINE, process.env.DATA_DIR || './donnees'),
  dossierSauvegardes: path.resolve(RACINE, process.env.SAUVEGARDE_DOSSIER || './sauvegardes'),
  cleSauvegarde: process.env.SAUVEGARDE_CLE || '',
};
if (config.cleSauvegarde && config.cleSauvegarde.length < 20) quitter('❌ SAUVEGARDE_CLE doit faire au moins 20 caractères.');
const sauvegardes = creerSauvegardes({ dossier: config.dossierSauvegardes, cle: config.cleSauvegarde });
const cheminBase = path.join(config.dossierDonnees, FICHIER_BASE);
const taille = (o) => (o > 1048576 ? `${(o / 1048576).toFixed(1)} Mo` : `${Math.ceil(o / 1024)} Ko`);

function ouvrirBaseActuelle({ lectureSeule = false } = {}) {
  if (!fs.existsSync(cheminBase)) return null;
  return new Database(cheminBase, { readonly: lectureSeule, fileMustExist: true });
}

switch (commande) {
  case 'liste': {
    const toutes = sauvegardes.liste();
    console.log(`Dossier : ${config.dossierSauvegardes}  ·  chiffrement : ${config.cleSauvegarde ? 'oui 🔒' : 'NON ⚠️'}\n`);
    if (!toutes.length) quitter('Aucune sauvegarde.', 0);
    for (const s of toutes) {
      console.log(`${new Date(s.date).toLocaleString('fr-FR')}  ${s.raison.padEnd(18)} ${taille(s.taille).padStart(8)}  ${s.chiffre ? '🔒' : '  '}  ${s.nom}`);
    }
    break;
  }

  case 'maintenant': {
    const db = ouvrirBaseActuelle({ lectureSeule: true });
    if (!db) quitter(`❌ Pas de base à sauvegarder dans ${cheminBase}`);
    try {
      const s = sauvegardes.sauvegarder(db, 'manuel');
      console.log(`✅ ${s.nom} (${taille(s.taille)})`);
    } catch (e) {
      quitter(`❌ ${e.message}`);
    } finally {
      db.close();
    }
    break;
  }

  case 'verifier': {
    try {
      const { eleves, schema } = sauvegardes.lire(nom);
      console.log(`✅ Sauvegarde lisible et intacte : ${eleves} élève(s), schéma v${schema}.`);
    } catch (e) {
      quitter(`❌ ${e.message}`);
    }
    break;
  }

  case 'restaurer': {
    if (serveurActif(config.dossierDonnees) && option !== '--force') {
      quitter('❌ Le site semble encore en marche. Arrête-le d’abord : docker stop atelier\n   (ou ajoute --force si tu es sûr qu’il est arrêté).');
    }
    // 1. La sauvegarde à restaurer doit être lisible et saine (déchiffrement + intégrité).
    let lu;
    try {
      lu = sauvegardes.lire(nom);
    } catch (e) {
      quitter(`❌ ${e.message}`);
    }
    // 2. Filet de sécurité : la base actuelle est sauvegardée avant d'être remplacée.
    const actuelle = ouvrirBaseActuelle();
    if (actuelle) {
      try {
        actuelle.pragma('wal_checkpoint(TRUNCATE)');
        const s = sauvegardes.sauvegarder(actuelle, 'avant-restauration');
        console.log(`💾 Base actuelle mise de côté : ${s.nom}`);
      } catch (e) {
        quitter(`❌ Impossible de mettre la base actuelle de côté, restauration annulée : ${e.message}`);
      } finally {
        actuelle.close();
      }
    }
    // 3. Remplacement atomique.
    fs.mkdirSync(config.dossierDonnees, { recursive: true });
    const temporaire = `${cheminBase}.restauration.tmp`;
    fs.rmSync(temporaire, { force: true });
    fs.writeFileSync(temporaire, lu.clair, { mode: 0o600, flag: 'wx' });
    for (const suffixe of ['-wal', '-shm']) fs.rmSync(cheminBase + suffixe, { force: true });
    fs.renameSync(temporaire, cheminBase);
    // 4. Contrôle final.
    const db = new Database(cheminBase, { readonly: true });
    const ok = db.pragma('integrity_check', { simple: true });
    db.close();
    if (ok !== 'ok') quitter(`❌ Contrôle après restauration : ${ok}`);
    console.log(`✅ Restauration terminée : ${lu.eleves} élève(s). Tu peux relancer le site : docker start atelier`);
    break;
  }

  default:
    quitter('Utilisation : node serveur/outils/sauvegardes.js liste | maintenant | verifier <nom> | restaurer <nom>', commande ? 1 : 0);
}
