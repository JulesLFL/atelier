// Construction de l'application (Express + Socket.IO). Séparé de index.js pour les tests.
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { RACINE } from './config.js';
import { ouvrirBdd } from './bdd.js';
import { creerAuth, lireCookies } from './auth.js';
import { chargerCatalogue } from './catalogue.js';
import { creerService } from './service.js';
import { creerTempsReel } from './temps-reel.js';
import { routesEleve } from './routes/eleve.js';
import { routesMentor } from './routes/mentor.js';
import { routesSite, pageIntrouvable } from './routes/site.js';
import { creerSauvegardes } from './sauvegarde.js';
import { creerDiscord } from './discord.js';
import { creerVerrou } from './verrou.js';

// Politique de sécurité des pages de l'Atelier.
// Attention : l'aperçu (iframe srcdoc) HÉRITE de cette politique. Le JavaScript de l'élève y est
// en ligne, d'où 'unsafe-inline'. Ce n'est pas un trou : l'iframe est en sandbox sans
// allow-same-origin, et l'application n'insère jamais de HTML venant de l'élève.
const CSP_APP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https:",
  'img-src * data: blob:',
  "font-src 'self' https: data:",
  'media-src https: data:',
  "connect-src 'self'",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

// Pages que les moteurs de recherche peuvent indexer (tout le reste est en noindex : élèves mineurs).
const PAGES_INDEXABLES = ['/', '/programme', '/a-propos', '/parents', '/journal', '/mentions-legales', '/confidentialite', '/conditions'];
const INDEXABLES = new Set([...PAGES_INDEXABLES, '/robots.txt', '/sitemap.xml']);

export async function creerApplication(config, { front = true, fichierBdd, sauvegardesAuto = true } = {}) {
  const enMemoire = fichierBdd === ':memory:';
  const discord = creerDiscord(config.webhookDiscord);
  const sauvegardes = creerSauvegardes({ dossier: config.dossierSauvegardes, cle: config.cleSauvegarde });
  // Si la structure de la base doit changer, on la sauvegarde AVANT. Si la sauvegarde échoue,
  // le serveur refuse de démarrer : on ne touche jamais à une base sans filet.
  const bdd = ouvrirBdd({
    dossier: config.dossierDonnees,
    secret: config.secretSession,
    fichier: fichierBdd,
    avantMigration: enMemoire ? undefined : (db) => sauvegardes.sauvegarder(db, 'avant-migration'),
  });
  if (!enMemoire) {
    const controle = bdd.db.pragma('quick_check', { simple: true });
    if (controle !== 'ok') {
      console.error(`⚠️  Contrôle de la base : ${controle}`);
      discord.envoyer(`⚠️ La base de l’Atelier semble abîmée (${controle}). Pense à restaurer une sauvegarde.`);
    }
  }
  const catalogue = await chargerCatalogue();
  const auth = creerAuth(config, bdd);
  const service = creerService({ bdd, catalogue, config, discord });

  const app = express();
  const serveur = http.createServer(app);
  const temps = creerTempsReel(serveur, { bdd, auth, service, catalogue, config, discord });
  const ctx = { config, bdd, catalogue, auth, service, temps, sauvegardes, discord };

  // Sauvegarde automatique quotidienne + verrou « serveur en marche » (la restauration le vérifie).
  const arrets = [];
  if (!enMemoire) {
    arrets.push(creerVerrou(config.dossierDonnees));
    if (sauvegardesAuto) {
      arrets.push(
        sauvegardes.planifier(bdd.db, {
          surErreur: (e) => discord.envoyer(`❌ Sauvegarde automatique de l’Atelier impossible : ${e.message}`),
        }),
      );
    }
    if (!config.cleSauvegarde) console.warn('⚠️  SAUVEGARDE_CLE absente : les sauvegardes ne sont PAS chiffrées.');
    // Rappel des comptes inactifs depuis plus d'un an (engagement de la politique de confidentialité) :
    // vérifié chaque jour, alerte Discord au plus une fois par semaine.
    let dernierRappel = 0;
    const rappelInactifs = () => {
      const inactifs = bdd.inactifs(365);
      if (!inactifs.length || Date.now() - dernierRappel < 7 * 86400000) return;
      dernierRappel = Date.now();
      discord.envoyer(`💤 ${inactifs.length} compte(s) inactif(s) depuis plus d’un an : ${inactifs.map((e) => e.pseudo).join(', ')}. Pense à les supprimer (politique de confidentialité).`);
    };
    const t1 = setTimeout(rappelInactifs, 2 * 60 * 1000);
    const t2 = setInterval(rappelInactifs, 24 * 3600 * 1000);
    t1.unref();
    t2.unref();
    arrets.push(() => (clearTimeout(t1), clearInterval(t2)));
  }

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // derrière Cloudflare Tunnel

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Les élèves sont mineurs : rien n'est indexé par les moteurs de recherche, sauf la page
    // d'accueil et les pages légales.
    if (!INDEXABLES.has(req.path)) res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    if (!req.path.startsWith('/site/')) {
      res.setHeader('Content-Security-Policy', CSP_APP);
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    }
    next();
  });

  app.use('/api', express.json({ limit: '1mb' }));
  // Anti-CSRF : toute requête qui modifie quelque chose doit porter l'en-tête X-Atelier.
  // Un autre site ne peut pas l'ajouter sans autorisation CORS (que l'on ne donne jamais).
  app.use('/api', (req, res, next) => {
    if (req.method !== 'GET' && req.get('X-Atelier') !== '1') return res.status(403).json({ erreur: 'Requête refusée.' });
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.get('/api/sante', (req, res) => res.json({ ok: true }));

  // Données publiques : le programme (sans les vérifications) et le journal des nouveautés.
  const { journal } = await import('../contenu/journal.js');
  app.get('/api/programme', (req, res) => res.json(catalogue.programme));
  app.get('/api/journal', (req, res) => res.json(journal));

  // Référencement : robots.txt et sitemap.xml, avec l'adresse publique du site.
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain').send(
      ['# Seules les pages de présentation sont indexables : les sites des élèves (mineurs) et les espaces privés ne le sont pas.', 'User-agent: *', ...PAGES_INDEXABLES.map((p) => `Allow: ${p === '/' ? '/$' : p}`), 'Disallow: /', '', `Sitemap: ${config.urlPublique}/sitemap.xml`, ''].join('\n'),
    );
  });
  app.get('/sitemap.xml', (req, res) => {
    const urls = PAGES_INDEXABLES.map((p) => `  <url><loc>${config.urlPublique}${p}</loc></url>`).join('\n');
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  });

  // Signalement des failles de sécurité (RFC 9116)
  app.get('/.well-known/security.txt', (req, res) => {
    const expire = new Date(Date.now() + 365 * 86400000).toISOString().replace(/\.\d+Z$/, 'Z');
    res.type('text/plain').send(
      `Contact: mailto:jules.lfl.pro@proton.me\nExpires: ${expire}\nPreferred-Languages: fr, en\nCanonical: ${config.urlPublique}/.well-known/security.txt\nPolicy: ${config.urlPublique}/conditions\n`,
    );
  });
  app.use(routesEleve(ctx));
  app.use('/api/mentor', routesMentor(ctx));
  app.use(routesSite(ctx));
  app.use('/api', (req, res) => res.status(404).json({ erreur: 'Route inconnue.' }));

  if (front) await brancherFront(app, ctx);

  app.use((req, res) => {
    res.status(404).type('html').send(pageIntrouvable());
  });
  // Gestionnaire d'erreurs : jamais de détails techniques envoyés au navigateur.
  app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') return res.status(413).json({ erreur: 'Envoi trop gros.' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ erreur: 'Données illisibles.' });
    console.error('[erreur]', err);
    res.status(500).json({ erreur: 'Oups, erreur du serveur.' });
  });

  const arreter = () => arrets.forEach((f) => f());
  return { app, serveur, arreter, ...ctx };
}

/** Pages de l'interface : en production depuis dist/, en développement via Vite. */
async function brancherFront(app, { auth, config }) {
  const dist = path.join(RACINE, 'dist');
  const pages = {
    accueil: 'index.html',
    atelier: 'atelier.html',
    connexion: 'connexion.html',
    mentor: 'mentor.html',
    vitrine: 'vitrine.html',
    mentions: 'mentions-legales.html',
    confidentialite: 'confidentialite.html',
    conditions: 'conditions.html',
    programme: 'programme.html',
    journal: 'journal.html',
    apropos: 'a-propos.html',
    parents: 'parents.html',
    diplome: 'diplome.html',
  };
  // Les pages contiennent « __URL_PUBLIQUE__ » (adresses absolues pour le partage et le référencement).
  const avecUrl = (html) => html.replaceAll('__URL_PUBLIQUE__', config.urlPublique);
  let envoyerPage;

  if (existsSync(path.join(dist, 'index.html'))) {
    app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y', index: false }));
    // Fichiers de client/public (favicon…). Les pages HTML passent par les routes ci-dessous.
    app.use(express.static(dist, { index: false, maxAge: '1d', extensions: [] }));
    const { readFileSync } = await import('node:fs');
    const cache = new Map();
    envoyerPage = (res, page) => {
      if (!cache.has(page)) cache.set(page, avecUrl(readFileSync(path.join(dist, pages[page]), 'utf8')));
      res.setHeader('Cache-Control', 'no-cache');
      res.type('html').send(cache.get(page));
    };
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({ configFile: path.join(RACINE, 'vite.config.js'), server: { middlewareMode: true }, appType: 'custom' });
    app.use(vite.middlewares);
    const { readFile } = await import('node:fs/promises');
    envoyerPage = async (res, page, url) => {
      const brut = await readFile(path.join(RACINE, 'client', pages[page]), 'utf8');
      res.type('html').send(avecUrl(await vite.transformIndexHtml(url, brut)));
    };
  }

  const connecte = (req) => Boolean(auth.eleveDepuisCookies(lireCookies(req.headers.cookie)));

  // Pages publiques
  app.get('/', (req, res) => envoyerPage(res, 'accueil', req.originalUrl));
  app.get('/vitrine', (req, res) => envoyerPage(res, 'vitrine', req.originalUrl));
  app.get('/mentions-legales', (req, res) => envoyerPage(res, 'mentions', req.originalUrl));
  app.get('/confidentialite', (req, res) => envoyerPage(res, 'confidentialite', req.originalUrl));
  app.get('/conditions', (req, res) => envoyerPage(res, 'conditions', req.originalUrl));
  app.get('/programme', (req, res) => envoyerPage(res, 'programme', req.originalUrl));
  app.get('/journal', (req, res) => envoyerPage(res, 'journal', req.originalUrl));
  app.get('/a-propos', (req, res) => envoyerPage(res, 'apropos', req.originalUrl));
  app.get('/parents', (req, res) => envoyerPage(res, 'parents', req.originalUrl));
  app.get('/diplome', (req, res) => (connecte(req) ? envoyerPage(res, 'diplome', req.originalUrl) : res.redirect(303, '/connexion')));

  // Connexion (déjà connecté : direction l'atelier). /entree = ancienne adresse.
  app.get('/connexion', (req, res) => (connecte(req) ? res.redirect(303, '/atelier') : envoyerPage(res, 'connexion', req.originalUrl)));
  app.get('/entree', (req, res) => res.redirect(301, `/connexion${req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : ''}`));

  // Espaces privés
  app.get('/atelier', (req, res) => (connecte(req) ? envoyerPage(res, 'atelier', req.originalUrl) : res.redirect(303, '/connexion')));
  app.get('/mentor', (req, res) => envoyerPage(res, 'mentor', req.originalUrl));
}
