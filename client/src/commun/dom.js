// Petits outils DOM. Règle d'or : le texte venant de l'élève ou du serveur n'est
// JAMAIS inséré avec innerHTML, toujours comme texte (textContent / nœuds texte).

/** Crée un élément : h('button', { class: 'btn', onclick: f }, 'Texte', autreNoeud) */
export function h(balise, attributs = {}, ...enfants) {
  const el = document.createElement(balise);
  for (const [cle, valeur] of Object.entries(attributs || {})) {
    if (valeur === undefined || valeur === null || valeur === false) continue;
    if (cle.startsWith('on') && typeof valeur === 'function') el.addEventListener(cle.slice(2), valeur);
    else if (cle === 'class') el.className = valeur;
    else if (cle === 'dataset') Object.assign(el.dataset, valeur);
    else if (valeur === true) el.setAttribute(cle, '');
    else el.setAttribute(cle, String(valeur));
  }
  ajouter(el, enfants);
  return el;
}

function ajouter(parent, enfants) {
  for (const e of enfants.flat(Infinity)) {
    if (e === null || e === undefined || e === false) continue;
    parent.append(e instanceof Node ? e : document.createTextNode(String(e)));
  }
}

export function vider(el, ...enfants) {
  el.replaceChildren();
  ajouter(el, enfants);
  return el;
}

export const $ = (sel, racine = document) => racine.querySelector(sel);

/**
 * Mini-Markdown sûr → nœuds DOM : **gras**, *italique*, `code`,
 * paragraphes (ligne vide), listes (lignes « - » ou « 1. »).
 */
export function markdown(texte) {
  const frag = document.createDocumentFragment();
  const blocs = String(texte || '').trim().split(/\n\s*\n/);
  for (const bloc of blocs) {
    const lignes = bloc.split('\n');
    const puce = lignes.every((l) => /^\s*-\s+/.test(l));
    const numero = lignes.every((l) => /^\s*\d+\.\s+/.test(l));
    if (puce || numero) {
      const liste = h(numero ? 'ol' : 'ul');
      for (const l of lignes) liste.append(h('li', {}, enLigne(l.replace(/^\s*(-|\d+\.)\s+/, ''))));
      frag.append(liste);
    } else {
      const p = h('p');
      lignes.forEach((l, i) => {
        if (i) p.append(h('br'));
        p.append(enLigne(l));
      });
      frag.append(p);
    }
  }
  return frag;
}

function enLigne(texte) {
  const frag = document.createDocumentFragment();
  const motif = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let dernier = 0;
  let m;
  while ((m = motif.exec(texte))) {
    if (m.index > dernier) frag.append(texte.slice(dernier, m.index));
    if (m[1] !== undefined) frag.append(h('code', {}, m[1]));
    else if (m[2] !== undefined) frag.append(h('strong', {}, m[2]));
    else frag.append(h('em', {}, m[3]));
    dernier = motif.lastIndex;
  }
  if (dernier < texte.length) frag.append(texte.slice(dernier));
  return frag;
}

export function debounce(fn, ms) {
  let minuterie;
  const f = (...args) => {
    clearTimeout(minuterie);
    minuterie = setTimeout(() => fn(...args), ms);
  };
  f.annuler = () => clearTimeout(minuterie);
  return f;
}

export async function copier(texte) {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    // Secours pour les navigateurs sans presse-papiers asynchrone
    const zone = h('textarea', { style: 'position:fixed;opacity:0' });
    zone.value = texte;
    document.body.append(zone);
    zone.select();
    const ok = document.execCommand('copy');
    zone.remove();
    return ok;
  }
}

/** Stockage local de confort (taille de police, mode…). Ne jette jamais d'erreur. */
export const prefs = {
  lire(cle, defaut) {
    try {
      const v = localStorage.getItem(`atelier:${cle}`);
      return v === null ? defaut : JSON.parse(v);
    } catch {
      return defaut;
    }
  },
  ecrire(cle, valeur) {
    try {
      localStorage.setItem(`atelier:${cle}`, JSON.stringify(valeur));
    } catch {
      /* navigation privée… tant pis */
    }
  },
};

export function dateRelative(ms) {
  if (!ms) return 'jamais';
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  const j = Math.round(s / 86400);
  if (j < 30) return `il y a ${j} jour${j > 1 ? 's' : ''}`;
  return new Date(ms).toLocaleDateString('fr-FR');
}

export function duree(secondes) {
  const s = Math.max(0, Math.round(secondes || 0));
  const hh = Math.floor(s / 3600);
  const mm = Math.round((s % 3600) / 60);
  return hh ? `${hh} h ${String(mm).padStart(2, '0')}` : `${mm} min`;
}
