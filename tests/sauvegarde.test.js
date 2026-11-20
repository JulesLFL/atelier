import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import Database from 'better-sqlite3';
import { chiffrer, dechiffrer, creerSauvegardes, cheminSauvegarde } from '../serveur/sauvegarde.js';
import { ouvrirBdd, MIGRATIONS } from '../serveur/bdd.js';
import { creerVerrou } from '../serveur/verrou.js';

const CLE = 'une-phrase-secrete-tres-longue-pour-les-tests';
let racine, dossierDonnees, dossierSauv;
const silencieux = { log() {}, error() {}, warn() {} };

beforeEach(() => {
  racine = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-sauv-'));
  dossierDonnees = path.join(racine, 'donnees');
  dossierSauv = path.join(racine, 'sauvegardes');
});
afterEach(() => fs.rmSync(racine, { recursive: true, force: true }));

function baseAvecEleve(pseudo = 'alex') {
  const bdd = ouvrirBdd({ dossier: dossierDonnees, secret: 'x'.repeat(40) });
  bdd.creerEleve(pseudo);
  return bdd;
}

describe('Chiffrement', () => {
  it('aller-retour, mauvaise clé et fichier modifié', () => {
    const clair = Buffer.from('données secrètes de l’élève');
    const c = chiffrer(clair, CLE);
    expect(c.includes(clair)).toBe(false);
    expect(dechiffrer(c, CLE).equals(clair)).toBe(true);
    expect(() => dechiffrer(c, CLE + 'x')).toThrow(/mauvaise clé/);
    const abime = Buffer.from(c);
    abime[abime.length - 1] ^= 1;
    expect(() => dechiffrer(abime, CLE)).toThrow(/abîmé|modifié/);
    expect(() => dechiffrer(c, '')).toThrow(/SAUVEGARDE_CLE/);
    // Deux chiffrements du même contenu sont différents (sel et IV aléatoires)
    expect(chiffrer(clair, CLE).equals(c)).toBe(false);
  });
});

describe('Sauvegardes', () => {
  it('chiffrée, illisible sans clé, droits stricts, relisible', () => {
    const bdd = baseAvecEleve();
    const s = creerSauvegardes({ dossier: dossierSauv, cle: CLE, journal: silencieux });
    const r = s.sauvegarder(bdd.db, 'manuel');
    const fichier = path.join(dossierSauv, r.nom);
    expect(r.nom).toMatch(/_manuel\.sqlite\.chiffre$/);
    const contenu = fs.readFileSync(fichier);
    expect(contenu.includes(Buffer.from('SQLite format'))).toBe(false);
    expect(contenu.includes(Buffer.from('alex'))).toBe(false);
    expect(fs.statSync(fichier).mode & 0o777).toBe(0o600);
    expect(fs.statSync(dossierSauv).mode & 0o777).toBe(0o700);
    expect(s.lire(r.nom).eleves).toBe(1);
    // Sans la clé : impossible à lire
    const sansCle = creerSauvegardes({ dossier: dossierSauv, journal: silencieux });
    expect(() => sansCle.lire(r.nom)).toThrow(/SAUVEGARDE_CLE/);
    // Fichier modifié : refusé
    contenu[100] ^= 1;
    fs.writeFileSync(fichier, contenu);
    expect(() => s.lire(r.nom)).toThrow(/modifié/);
    bdd.fermer();
  });

  it('sans clé : fonctionne, et le résumé le signale', () => {
    const bdd = baseAvecEleve();
    const s = creerSauvegardes({ dossier: dossierSauv, journal: silencieux });
    const r = s.sauvegarder(bdd.db, 'auto');
    expect(r.nom).toMatch(/_auto\.sqlite$/);
    expect(s.resume()).toMatchObject({ chiffrement: false, nombre: 1 });
    bdd.fermer();
  });

  it('rotation : garde les 14 dernières sauvegardes automatiques', () => {
    const bdd = baseAvecEleve();
    const s = creerSauvegardes({ dossier: dossierSauv, journal: silencieux });
    for (let i = 0; i < 17; i++) s.sauvegarder(bdd.db, 'auto');
    s.sauvegarder(bdd.db, 'manuel');
    const liste = s.liste();
    expect(liste.filter((x) => x.raison === 'auto')).toHaveLength(14);
    expect(liste.filter((x) => x.raison === 'manuel')).toHaveLength(1);
    expect(fs.readdirSync(dossierSauv).filter((n) => n.endsWith('.tmp'))).toHaveLength(0);
    bdd.fermer();
  });

  it('refuse les noms piégés et les liens symboliques', () => {
    fs.mkdirSync(dossierSauv, { recursive: true });
    expect(() => cheminSauvegarde(dossierSauv, '../donnees/atelier.db')).toThrow(/invalide/);
    expect(() => cheminSauvegarde(dossierSauv, '/etc/passwd')).toThrow(/invalide/);
    const lien = 'atelier_20260101-000000-000_manuel.sqlite';
    fs.symlinkSync('/etc/hostname', path.join(dossierSauv, lien));
    expect(() => cheminSauvegarde(dossierSauv, lien)).toThrow(/lien/);
  });

  it('refuse de sauvegarder une base qui n’est pas celle de l’Atelier', () => {
    const autre = new Database(':memory:');
    autre.exec('CREATE TABLE truc (x)');
    const s = creerSauvegardes({ dossier: dossierSauv, journal: silencieux });
    expect(() => s.sauvegarder(autre, 'manuel')).toThrow(/pas une base de l’Atelier/);
    expect(s.resume().erreur.message).toMatch(/pas une base/);
  });

  it('sauvegarde automatiquement avant une migration', () => {
    // Base « ancienne » (schéma v1)
    fs.mkdirSync(dossierDonnees, { recursive: true });
    const ancienne = new Database(path.join(dossierDonnees, 'atelier.db'));
    ancienne.exec(MIGRATIONS[0]);
    ancienne.pragma('user_version = 1');
    ancienne.prepare("INSERT INTO eleves (pseudo, code_hash, cree_le) VALUES ('alex', 'h', 1)").run();
    ancienne.close();
    const s = creerSauvegardes({ dossier: dossierSauv, cle: CLE, journal: silencieux });
    const bdd = ouvrirBdd({ dossier: dossierDonnees, secret: 'x'.repeat(40), avantMigration: (db) => s.sauvegarder(db, 'avant-migration') });
    expect(bdd.db.pragma('user_version', { simple: true })).toBe(MIGRATIONS.length);
    const [sauv] = s.liste();
    expect(sauv.raison).toBe('avant-migration');
    expect(s.lire(sauv.nom).schema).toBe(1);
    bdd.fermer();
  });
});

describe('Outil de restauration (ligne de commande)', () => {
  const outil = (args, env) =>
    execFileSync('node', ['serveur/outils/sauvegardes.js', ...args], {
      env: { ...process.env, ATELIER_SANS_DOTENV: '1', MENTOR_PASSWORD: 'x'.repeat(12), SESSION_SECRET: 's'.repeat(40), DATA_DIR: dossierDonnees, SAUVEGARDE_DOSSIER: dossierSauv, SAUVEGARDE_CLE: CLE, ...env },
      encoding: 'utf8',
      stdio: 'pipe',
    });

  it('restaure une sauvegarde, garde l’état actuel de côté, refuse si le site tourne', () => {
    const bdd = baseAvecEleve('alex');
    const s = creerSauvegardes({ dossier: dossierSauv, cle: CLE, journal: silencieux });
    const { nom } = s.sauvegarder(bdd.db, 'manuel');
    bdd.creerEleve('bob'); // changement après la sauvegarde
    bdd.fermer();

    expect(outil(['verifier', nom])).toMatch(/1 élève/);
    expect(outil(['liste'])).toMatch(/chiffrement : oui/);

    const arreterVerrou = creerVerrou(dossierDonnees);
    expect(() => outil(['restaurer', nom])).toThrow(/encore en marche/);
    arreterVerrou();

    expect(outil(['restaurer', nom])).toMatch(/Restauration terminée : 1 élève/);
    const apres = new Database(path.join(dossierDonnees, 'atelier.db'), { readonly: true });
    expect(apres.prepare('SELECT pseudo FROM eleves').all().map((e) => e.pseudo)).toEqual(['alex']);
    apres.close();
    // L'état d'avant (avec bob) a été mis de côté
    const miseDeCote = creerSauvegardes({ dossier: dossierSauv, cle: CLE, journal: silencieux }).liste().find((x) => x.raison === 'avant-restauration');
    expect(miseDeCote.eleves).toBe(2);
    expect(() => outil(['restaurer', '../../etc/passwd'])).toThrow(/invalide/);
  });
});
