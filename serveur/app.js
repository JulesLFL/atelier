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

export async function creerApplication(config, { front = true, fichierBdd } = {}) {
  const bdd = ouvrirBdd({ dossier: config.dossierDonnees, secret: config.secretSession, fichier: fichierBdd });
  const catalogue = await chargerCatalogue();
  const auth = creerAuth(config, bdd);
  const service = creerService({ bdd, catalogue, config });

  const app = express();
  const serveur = http.createServer(app);
  const temps = creerTempsReel(serveur, { bdd, auth, service, catalogue, config });
  const ctx = { config, bdd, catalogue, auth, service, temps };

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // derrière Cloudflare Tunnel

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
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
  app.use(routesEleve(ctx));
  app.use('/api/mentor', routesMentor(ctx));
  app.use(routesSite(ctx));
  app.use('/api', (req, res) => res.status(404).json({ erreur: 'Route inconnue.' }));

  if (front) await brancherFront(app, ctx);

  app.use((req, res) => {
    res.status(404).type('html').send(pageIntrouvable('Page introuvable', 'Cette page n’existe pas. Retourne à l’atelier !'));
  });
  // Gestionnaire d'erreurs : jamais de détails techniques envoyés au navigateur.
  app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') return res.status(413).json({ erreur: 'Envoi trop gros.' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ erreur: 'Données illisibles.' });
    console.error('[erreur]', err);
    res.status(500).json({ erreur: 'Oups, erreur du serveur.' });
  });

  return { app, serveur, ...ctx };
}

/** Pages de l'interface : en production depuis dist/, en développement via Vite. */
async function brancherFront(app, { auth }) {
  const dist = path.join(RACINE, 'dist');
  const pages = { eleve: 'index.html', entree: 'entree.html', mentor: 'mentor.html' };
  let envoyerPage;

  if (existsSync(path.join(dist, 'index.html'))) {
    app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y', index: false }));
    // Fichiers de client/public (favicon…). Les pages HTML passent par les routes ci-dessous.
    app.use(express.static(dist, { index: false, maxAge: '1d', extensions: [] }));
    envoyerPage = (res, page) => res.sendFile(path.join(dist, pages[page]), { headers: { 'Cache-Control': 'no-cache' } });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({ configFile: path.join(RACINE, 'vite.config.js'), server: { middlewareMode: true }, appType: 'custom' });
    app.use(vite.middlewares);
    const { readFile } = await import('node:fs/promises');
    envoyerPage = async (res, page, url) => {
      const brut = await readFile(path.join(RACINE, 'client', pages[page]), 'utf8');
      res.type('html').send(await vite.transformIndexHtml(url, brut));
    };
  }

  app.get('/', (req, res) => {
    if (!auth.eleveDepuisCookies(lireCookies(req.headers.cookie))) return res.redirect(303, '/entree');
    envoyerPage(res, 'eleve', req.originalUrl);
  });
  app.get('/entree', (req, res) => envoyerPage(res, 'entree', req.originalUrl));
  app.get('/mentor', (req, res) => envoyerPage(res, 'mentor', req.originalUrl));
}
