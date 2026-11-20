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

export function pageIntrouvable(titre, texte) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${echapperHtml(titre)}</title><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f1117;color:#e6e8ef;font:18px/1.5 system-ui,sans-serif;text-align:center;padding:16px}
h1{font-size:4rem;margin:0}p{color:#a5abbd}</style></head>
<body><main><h1>🔍</h1><h2>${echapperHtml(titre)}</h2><p>${echapperHtml(texte)}</p></main></body></html>`;
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

// --- Vitrine (page publique, uniquement les sites cochés par le mentor) ------------
function pageVitrine(sites) {
  const cartes = sites
    .map((s) => {
      const titre = echapperHtml(titreDepuisHtml(s.html, `Le site de ${s.pseudo}`));
      const adresse = `/site/${encodeURIComponent(s.pseudo)}`;
      return `<a class="carte" href="${adresse}">
  <div class="miniature"><iframe src="${adresse}" sandbox="" loading="lazy" tabindex="-1" aria-hidden="true" title=""></iframe></div>
  <div class="infos"><strong>${titre}</strong><span>par ${echapperHtml(s.pseudo)}</span></div>
</a>`;
    })
    .join('\n');
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Vitrine · L'Atelier</title><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0b0e14;color:#e8ebf3;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
header{padding:48px 16px 24px;text-align:center}h1{margin:0;font-size:clamp(1.8rem,5vw,2.6rem);letter-spacing:-.02em}
header p{color:#a7afc2;margin:8px 0 0}main{max-width:1100px;margin:0 auto;padding:16px;display:grid;gap:20px;grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))}
.carte{display:block;text-decoration:none;color:inherit;background:#121620;border:1px solid #2a3142;border-radius:16px;overflow:hidden;transition:transform .2s,border-color .2s}
.carte:hover,.carte:focus-visible{transform:translateY(-4px);border-color:#8b5cf6;outline:none}
.miniature{position:relative;height:200px;overflow:hidden;background:#fff}
.miniature iframe{position:absolute;top:0;left:0;width:400%;height:400%;border:0;transform:scale(.25);transform-origin:0 0;pointer-events:none}
.infos{padding:12px 14px;display:grid}.infos span{color:#a7afc2;font-size:.9rem}
.vide{grid-column:1/-1;text-align:center;color:#a7afc2;padding:40px 0}footer{text-align:center;color:#8a93a8;padding:32px 16px;font-size:.9rem}
a.retour{color:#c4b5fd}
</style></head><body>
<header><h1>🌍 La vitrine de l'Atelier</h1><p>Des sites codés de A à Z par des élèves qui apprennent le HTML, le CSS et le JavaScript.</p></header>
<main>${cartes || '<p class="vide">Aucun site dans la vitrine pour le moment.</p>'}</main>
<footer><a class="retour" href="/entree">L’Atelier</a></footer>
</body></html>`;
}

export function routesSite({ bdd, auth, service, temps }) {
  const r = Router();
  const nouvelleVisite = creerCompteur();

  r.get('/vitrine', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.type('html').send(pageVitrine(bdd.listeVitrine()));
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
