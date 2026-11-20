// Verrou « le serveur tourne » : un petit fichier dans le dossier des données, mis à jour
// chaque minute. L'outil de restauration refuse de remplacer la base tant qu'il est récent.
import fs from 'node:fs';
import path from 'node:path';

export const NOM_VERROU = '.serveur-actif';
export const VERROU_VALIDE_MS = 2 * 60 * 1000;

export function creerVerrou(dossier) {
  const fichier = path.join(dossier, NOM_VERROU);
  const ecrire = () => {
    try {
      fs.writeFileSync(fichier, JSON.stringify({ pid: process.pid, maj: new Date().toISOString() }), { mode: 0o600 });
    } catch {
      /* pas bloquant */
    }
  };
  ecrire();
  const minuterie = setInterval(ecrire, 60 * 1000);
  minuterie.unref();
  return () => {
    clearInterval(minuterie);
    fs.rmSync(fichier, { force: true });
  };
}

export function serveurActif(dossier) {
  const infos = fs.statSync(path.join(dossier, NOM_VERROU), { throwIfNoEntry: false });
  return Boolean(infos && Date.now() - infos.mtimeMs < VERROU_VALIDE_MS);
}
