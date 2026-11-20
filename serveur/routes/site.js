// Sites publiés : /site/<pseudo>
//
// Sécurité : la page est servie avec « Content-Security-Policy: sandbox ».
// Le navigateur la traite alors comme venant d'une origine opaque (comme l'iframe de l'aperçu) :
// son JavaScript ne peut lire ni les cookies de l'Atelier, ni appeler son API, même si un mentor
// connecté visite la page.
import { Router } from 'express';
import { assemblerPage, echapperHtml } from '../../partage/regles.js';
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

export function routesSite({ bdd }) {
  const r = Router();

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
    const page = assemblerPage({ ...pub, js: protegerBoucles(pub.js) }, { onglets: pub.onglets.split(','), enTete: GARDE });
    res.type('html').send(page);
  });

  return r;
}
