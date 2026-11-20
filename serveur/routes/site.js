// Sites publiés : /site/<pseudo>
//
// Sécurité : la page est servie avec « Content-Security-Policy: sandbox ».
// Le navigateur la traite alors comme venant d'une origine opaque (comme l'iframe de l'aperçu) :
// son JavaScript ne peut lire ni les cookies de l'Atelier, ni appeler son API, même si un mentor
// connecté visite la page.
import { Router } from 'express';
import crypto from 'node:crypto';
import { assemblerPage, echapperHtml, titreDepuisHtml } from '../../partage/regles.js';
import { lireCookies, ipClient } from '../auth.js';
import { protegerBoucles } from '../../partage/garde-boucles.js';

// Garde des boucles infinies (voir partage/garde-boucles.js) : une boucle qui tourne
// plus de 2 s d'affilée est arrêtée, pour ne jamais geler l'onglet d'un visiteur.
const GARDE = `<script>(function(){var d=0,p=false;window.__atelierGarde=function(){var t=performance.now();
if(!p){p=true;d=t;setTimeout(function(){p=false},0)}return t-d>2000}})();</script>`;

const CSP_SITE = [
  'sandbox allow-scripts allow-modals allow-popups allow-popups-to-escape-sandbox',
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline' https:",
  'img-src https: http: data:',
  'font-src https: data:',
  'media-src https: data:',
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

export function pageIntrouvable(titre = 'Page introuvable', texte = 'Cette page n’existe pas, ou plus.') {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>${echapperHtml(titre)} · L'Atelier</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><style>
:root{color-scheme:light dark;--fond:#f5efe4;--texte:#1f1a16;--doux:#51473d;--accent:#b43c0b;--code:#1c1714}
@media (prefers-color-scheme:dark){:root{--fond:#15120f;--texte:#f3ede4;--doux:#c6bbac;--accent:#fdba74}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:var(--fond);color:var(--texte);font:17px/1.6 system-ui,sans-serif}
main{max-width:640px}h1{font-size:clamp(2rem,6vw,3.2rem);line-height:1.1;margin:0 0 12px;letter-spacing:-.02em}p{color:var(--doux)}
pre{background:var(--code);color:#efe8dd;border-radius:10px;padding:20px 22px;font:600 1rem/1.7 ui-monospace,Consolas,monospace;white-space:pre-wrap;margin:24px 0}
.b{color:#fb923c}.e{color:#f87171;text-decoration:underline wavy}.c{color:#a99d8d}nav{display:flex;flex-wrap:wrap;gap:8px 22px}a{color:var(--accent);font-weight:700}
</style></head><body><main>
<p style="font:600 .9rem ui-monospace,monospace;color:var(--accent)">// erreur 404</p>
<h1>${echapperHtml(titre)}</h1>
<p>${echapperHtml(texte)}</p>
<pre><span class="b">&lt;page&gt;</span>
  Introuvable…
<span class="b">&lt;/</span><span class="e">pgae</span><span class="b">&gt;</span>  <span class="c">← même les pros se trompent de balise</span></pre>
<nav><a href="/">Accueil</a><a href="/programme">Programme</a><a href="/vitrine">Vitrine</a><a href="/connexion">Connexion</a></nav>
</main></body></html>`;
}

// --- Compteur de visites anonyme ---------------------------------------------------
// Rien n'est enregistré sur le visiteur : pour ne pas compter deux fois la même personne
// dans la journée, on garde EN MÉMOIRE une empreinte salée (IP + navigateur + sel du jour),
// effacée chaque jour. Seul le nombre de visites est écrit dans la base.
const ROBOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|embed|discord|whatsapp|telegram|slack|twitter|curl|wget|python|headless|lighthouse|monitor|^node$|undici|axios|go-http|okhttp|java\/|libwww|httpclient/i;

function creerCompteur() {
  let jour = '';
  let sel = '';
  const vus = new Map(); // pseudo -> Set d'empreintes
  return function nouvelleVisite(pseudo, req) {
    const aujourdhui = new Date().toISOString().slice(0, 10);
    if (aujourdhui !== jour) {
      jour = aujourdhui;
      sel = crypto.randomBytes(16).toString('hex');
      vus.clear();
    }
    const empreinte = crypto.createHash('sha256').update(`${sel}|${ipClient(req)}|${req.get('user-agent') || ''}`).digest('base64url');
    const ensemble = vus.get(pseudo) ?? new Set();
    vus.set(pseudo, ensemble);
    if (ensemble.has(empreinte) || ensemble.size > 20000) return false;
    ensemble.add(empreinte);
    return true;
  };
}

function visiteQuiCompte(req, eleve, auth) {
  if (req.method !== 'GET') return false;
  if (ROBOTS.test(req.get('user-agent') || '')) return false;
  if (req.get('sec-purpose') || req.get('purpose')) return false; // préchargement
  if (req.get('sec-fetch-dest') === 'iframe') return false; // miniature de la vitrine
  const cookies = lireCookies(req.headers.cookie);
  if (auth.mentorDepuisCookies(cookies)) return false; // le mentor
  if (auth.eleveDepuisCookies(cookies)?.id === eleve.id) return false; // l'élève lui-même
  return true;
}

export function routesSite({ bdd, auth, service, temps }) {
  const r = Router();
  const nouvelleVisite = creerCompteur();

  // Données de la vitrine : uniquement les sites cochés par le mentor (pseudo, titre, date).
  r.get('/api/vitrine', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.json(bdd.listeVitrine().map((s) => ({ pseudo: s.pseudo, titre: titreDepuisHtml(s.html, `Le site de ${s.pseudo}`), publieLe: s.publie_le })));
  });

  r.get('/site/:pseudo', (req, res) => {
    const eleve = bdd.eleveParPseudo(String(req.params.pseudo).toLowerCase());
    const pub = eleve && bdd.publication(eleve.id);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-cache');
    if (!pub) {
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
      return res.status(404).type('html').send(pageIntrouvable('Site introuvable', 'Ce site n’existe pas ou n’est pas encore publié.'));
    }
    res.setHeader('Content-Security-Policy', CSP_SITE);
    if (visiteQuiCompte(req, eleve, auth) && nouvelleVisite(eleve.pseudo, req)) {
      bdd.ajouterVisite(eleve.id);
      // Badges « Célèbre » / « Star du web » : annoncés en direct si l'élève est connecté.
      const nouveaux = service?.attribuerBadges(eleve.id) ?? [];
      if (nouveaux.length) temps?.versEleve(eleve.id, 'badges:nouveaux', nouveaux);
    }
    const page = assemblerPage({ ...pub, js: protegerBoucles(pub.js) }, { onglets: pub.onglets.split(','), enTete: GARDE });
    res.type('html').send(page);
  });

  return r;
}
