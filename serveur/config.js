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
    // Sauvegardes : dossier séparé de la base, clé de chiffrement (fortement conseillée)
    dossierSauvegardes: path.resolve(RACINE, get('SAUVEGARDE_DOSSIER', './sauvegardes')),
    cleSauvegarde: get('SAUVEGARDE_CLE', ''),
    // Alertes Discord (optionnel)
    webhookDiscord: get('DISCORD_WEBHOOK_URL', ''),
  };
  // Cookies « Secure » : par défaut dès que l'URL publique est en HTTPS.
  config.cookiesSecurises = get('COOKIE_SECURE', config.urlPublique.startsWith('https://') ? 'true' : 'false') === 'true';

  const erreurs = [];
  if (config.motDePasseMentor.length < 10) erreurs.push('MENTOR_PASSWORD doit faire au moins 10 caractères.');
  if (config.secretSession.length < 32) erreurs.push('SESSION_SECRET doit faire au moins 32 caractères (génère-le avec : openssl rand -hex 32).');
  if (!Number.isInteger(config.port) || config.port <= 0) erreurs.push('PORT doit être un nombre.');
  if (config.cleSauvegarde && config.cleSauvegarde.length < 20) erreurs.push('SAUVEGARDE_CLE doit faire au moins 20 caractères (génère-la avec : openssl rand -base64 32).');
  if (config.cleSauvegarde && config.cleSauvegarde === config.secretSession) erreurs.push('SAUVEGARDE_CLE doit être différente de SESSION_SECRET.');
  if (config.webhookDiscord && !webhookDiscordValide(config.webhookDiscord)) {
    erreurs.push('DISCORD_WEBHOOK_URL doit être une adresse de webhook Discord (https://discord.com/api/webhooks/…).');
  }
  if (erreurs.length) {
    const e = new Error('Configuration invalide :\n  - ' + erreurs.join('\n  - '));
    e.code = 'CONFIG';
    throw e;
  }
  return config;
}

/** N'accepte que les vraies adresses de webhook Discord (le serveur n'appellera jamais autre chose). */
export function webhookDiscordValide(adresse) {
  try {
    const u = new URL(adresse);
    return (
      u.protocol === 'https:' &&
      ['discord.com', 'discordapp.com', 'ptb.discord.com', 'canary.discord.com'].includes(u.hostname) &&
      !u.port &&
      !u.username &&
      !u.password &&
      /^\/api\/webhooks\/\d{5,25}\/[\w-]{20,100}$/.test(u.pathname)
    );
  } catch {
    return false;
  }
}
