// Lecture et vérification de la configuration (variables d'environnement).
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// En local, on charge le fichier .env s'il existe (Docker passe les variables directement).
const fichierEnv = path.join(RACINE, '.env');
if (existsSync(fichierEnv) && !process.env.ATELIER_SANS_DOTENV) {
  process.loadEnvFile(fichierEnv);
}

export function chargerConfig(surcharges = {}) {
  const env = { ...process.env, ...surcharges };
  const get = (nom, defaut) => (env[nom] === undefined || env[nom] === '' ? defaut : env[nom]);

  const config = {
    port: Number(get('PORT', 3000)),
    production: get('NODE_ENV', 'development') === 'production',
    motDePasseMentor: get('MENTOR_PASSWORD', ''),
    secretSession: get('SESSION_SECRET', ''),
    dossierDonnees: path.resolve(RACINE, get('DATA_DIR', './donnees')),
    urlPublique: get('PUBLIC_URL', 'http://localhost:3000').replace(/\/+$/, ''),
  };
  // Cookies « Secure » : par défaut dès que l'URL publique est en HTTPS.
  config.cookiesSecurises = get('COOKIE_SECURE', config.urlPublique.startsWith('https://') ? 'true' : 'false') === 'true';

  const erreurs = [];
  if (config.motDePasseMentor.length < 10) erreurs.push('MENTOR_PASSWORD doit faire au moins 10 caractères.');
  if (config.secretSession.length < 32) erreurs.push('SESSION_SECRET doit faire au moins 32 caractères (génère-le avec : openssl rand -hex 32).');
  if (!Number.isInteger(config.port) || config.port <= 0) erreurs.push('PORT doit être un nombre.');
  if (erreurs.length) {
    const e = new Error('Configuration invalide :\n  - ' + erreurs.join('\n  - '));
    e.code = 'CONFIG';
    throw e;
  }
  return config;
}
