// ============================================================================
//  VÉRIFICATEUR HTML pour débutants
//  Le navigateur « répare » le HTML en silence : une balise oubliée ne fait aucune erreur,
//  la page est juste bizarre. Ce vérificateur repère les fautes classiques et les explique.
//  Il renvoie une liste de remarques { gravite, message, ligne, de, a } :
//    gravite « erreur »  : la structure est cassée (balise pas fermée, mal imbriquée…)
//    gravite « conseil » : ça marche, mais ce n'est pas propre (img sans alt…)
// ============================================================================

const VIDES = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const TEXTE_BRUT = new Set(['script', 'style', 'textarea', 'title']);
const CONNUES = new Set([
  ...VIDES,
  ...TEXTE_BRUT,
  'a', 'abbr', 'address', 'article', 'aside', 'audio', 'b', 'bdi', 'bdo', 'blockquote', 'body', 'button', 'canvas', 'caption', 'cite', 'code',
  'colgroup', 'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'fieldset', 'figcaption', 'figure', 'footer',
  'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'html', 'i', 'iframe', 'ins', 'kbd', 'label', 'legend', 'li', 'main',
  'map', 'mark', 'menu', 'meter', 'nav', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'picture', 'pre', 'progress', 'q',
  'rp', 'rt', 'ruby', 's', 'samp', 'search', 'section', 'select', 'slot', 'small', 'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody',
  'td', 'template', 'tfoot', 'th', 'thead', 'time', 'tr', 'u', 'ul', 'var', 'video', 'svg', 'path', 'circle', 'rect', 'line', 'polygon', 'g',
  'center', 'font', 'marquee',
]);
// Éléments qui ne peuvent pas être dans un <p> (le navigateur ferme le <p> avant eux).
const BLOCS = new Set(['address', 'article', 'aside', 'blockquote', 'div', 'dl', 'fieldset', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul']);
const MAX_REMARQUES = 8;

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}

function suggestion(nom) {
  let meilleure = null;
  let score = Infinity;
  for (const connue of CONNUES) {
    const d = distance(nom, connue);
    if (d > 2) continue;
    // À distance égale, on préfère la même première lettre et la même longueur (h7 → h1, pas hr).
    const s = d * 10 + (connue[0] === nom[0] ? 0 : 3) + (connue.length === nom.length ? 0 : 1) + (/^h\d$/.test(connue) ? 0 : 0.5);
    if (s < score) {
      score = s;
      meilleure = connue;
    }
  }
  return meilleure;
}

export function verifierHtml(html) {
  const texte = String(html || '');
  const remarques = [];
  const debutsLignes = [0];
  for (let i = 0; i < texte.length; i++) if (texte[i] === '\n') debutsLignes.push(i + 1);
  const ligneDe = (pos) => {
    let bas = 0;
    let haut = debutsLignes.length - 1;
    while (bas < haut) {
      const milieu = (bas + haut + 1) >> 1;
      if (debutsLignes[milieu] <= pos) bas = milieu;
      else haut = milieu - 1;
    }
    return bas + 1;
  };
  const ajouter = (gravite, message, de, a) => remarques.push({ gravite, message, ligne: ligneDe(de), de, a: Math.max(a, de + 1) });

  const pile = []; // { nom, de, a }
  const ids = new Map();
  let i = 0;
  while (i < texte.length) {
    const lt = texte.indexOf('<', i);
    if (lt < 0) break;

    // Commentaire
    if (texte.startsWith('<!--', lt)) {
      const fin = texte.indexOf('-->', lt + 4);
      if (fin < 0) {
        ajouter('erreur', 'Ce commentaire <!-- n’est jamais fermé par --> : tout ce qui suit est caché.', lt, lt + 4);
        break;
      }
      i = fin + 3;
      continue;
    }
    if (texte.startsWith('<!', lt)) {
      i = texte.indexOf('>', lt) + 1 || texte.length;
      continue;
    }

    const fermante = texte[lt + 1] === '/';
    const nomMatch = /^[a-zA-Z][a-zA-Z0-9-]*/.exec(texte.slice(lt + (fermante ? 2 : 1), lt + 40));
    if (!nomMatch) {
      i = lt + 1; // un « < » tout seul dans le texte (ex. « 3 < 5 ») : on l'ignore
      continue;
    }
    const nom = nomMatch[0].toLowerCase();

    // Cherche le « > » de fin en respectant les guillemets ; s'arrête si un « < » arrive avant.
    let j = lt + 1 + (fermante ? 1 : 0) + nom.length;
    let guillemet = null;
    let finBalise = -1;
    let coupee = -1;
    for (; j < texte.length; j++) {
      const c = texte[j];
      if (guillemet) {
        if (c === guillemet) guillemet = null;
        continue;
      }
      if (c === '"' || c === "'") guillemet = c;
      else if (c === '>') {
        finBalise = j;
        break;
      } else if (c === '<') {
        coupee = j;
        break;
      }
    }
    if (guillemet) {
      ajouter('erreur', `Il manque un guillemet ${guillemet} dans la balise <${nom}> : chaque valeur d’attribut s’ouvre et se ferme par un guillemet.`, lt, lt + nom.length + 1);
      break;
    }
    if (finBalise < 0) {
      ajouter('erreur', `La balise <${nom} n’est pas fermée par un chevron « > ».`, lt, lt + nom.length + 1);
      i = coupee > 0 ? coupee : texte.length;
      continue;
    }
    const interieur = texte.slice(lt + 1 + (fermante ? 1 : 0) + nom.length, finBalise);
    const de = lt;
    const a = finBalise + 1;
    i = a;

    if (!fermante && !CONNUES.has(nom) && !nom.includes('-')) {
      if (/^h\d+$/.test(nom)) ajouter('erreur', `La balise <${nom}> n’existe pas : les titres vont de <h1> (le plus grand) à <h6>.`, de, a);
      else {
        const s = suggestion(nom);
        ajouter('erreur', `La balise <${nom}> n’existe pas en HTML.${s ? ` Tu voulais dire <${s}> ?` : ''}`, de, a);
      }
    }

    if (fermante) {
      if (VIDES.has(nom)) {
        ajouter('conseil', `<${nom}> n’a pas de balise fermante : tu peux supprimer </${nom}>.`, de, a);
        continue;
      }
      const index = pile.map((p) => p.nom).lastIndexOf(nom);
      if (index < 0) {
        ajouter('erreur', `</${nom}> ferme une balise <${nom}> qui n’a jamais été ouverte (ou qui est déjà fermée).`, de, a);
        continue;
      }
      // Des balises ouvertes après <nom> ne sont pas fermées : mauvaise imbrication.
      for (const oubliee of pile.slice(index + 1).reverse()) {
        ajouter(
          'erreur',
          `<${oubliee.nom}> (ligne ${ligneDe(oubliee.de)}) devrait être fermée avant </${nom}>. La dernière balise ouverte doit être la première fermée.`,
          oubliee.de,
          oubliee.a,
        );
      }
      pile.length = index;
      continue;
    }

    // Balise ouvrante
    const parent = pile.at(-1)?.nom;
    if (nom === 'li' && !['ul', 'ol', 'menu'].includes(parent)) ajouter('conseil', 'Un <li> doit être à l’intérieur d’une liste <ul> ou <ol>.', de, a);
    if (['tr'].includes(nom) && !['table', 'thead', 'tbody', 'tfoot'].includes(parent)) ajouter('conseil', 'Un <tr> doit être à l’intérieur d’un <table>.', de, a);
    if (['td', 'th'].includes(nom) && parent !== 'tr') ajouter('conseil', `Un <${nom}> doit être à l’intérieur d’une ligne <tr>.`, de, a);
    if (BLOCS.has(nom) && pile.some((p) => p.nom === 'p')) {
      ajouter('erreur', `Un <${nom}> ne peut pas être à l’intérieur d’un <p> : ferme le </p> avant.`, de, a);
    }
    if (nom === 'img') {
      if (!/\bsrc\s*=/i.test(interieur)) ajouter('conseil', 'Cette image n’a pas d’attribut src : le navigateur ne sait pas quelle image afficher.', de, a);
      if (!/\balt\s*=/i.test(interieur)) ajouter('conseil', 'Ajoute un attribut alt="…" à ton image : une description pour ceux qui ne la voient pas.', de, a);
    }
    if (nom === 'a' && !/\bhref\s*=/i.test(interieur)) ajouter('conseil', 'Ce lien <a> n’a pas d’attribut href : il ne mène nulle part.', de, a);
    const id = /\bid\s*=\s*(["'])(.*?)\1/i.exec(interieur)?.[2];
    if (id) {
      if (ids.has(id)) ajouter('conseil', `L’id « ${id} » est déjà utilisé ligne ${ids.get(id)} : un id doit être unique dans la page.`, de, a);
      else ids.set(id, ligneDe(de));
    }

    if (VIDES.has(nom) || interieur.trim().endsWith('/')) continue;
    if (TEXTE_BRUT.has(nom)) {
      const fin = texte.toLowerCase().indexOf(`</${nom}`, a);
      if (fin < 0) {
        ajouter('erreur', `<${nom}> n’est jamais fermée : il manque </${nom}>.`, de, a);
        break;
      }
      i = fin;
      pile.push({ nom, de, a });
      continue;
    }
    pile.push({ nom, de, a });
  }

  for (const oubliee of pile) {
    ajouter('erreur', `<${oubliee.nom}> n’est jamais fermée : il manque </${oubliee.nom}>.`, oubliee.de, oubliee.a);
  }
  remarques.sort((x, y) => (x.gravite === y.gravite ? x.de - y.de : x.gravite === 'erreur' ? -1 : 1));
  return remarques.slice(0, MAX_REMARQUES);
}
