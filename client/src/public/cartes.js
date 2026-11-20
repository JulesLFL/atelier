// Cartes de la vitrine : une miniature du site (iframe SANS script : sandbox="") + titre + pseudo.
import { h } from '../commun/dom.js';

export function carteSite({ pseudo, titre, publieLe }) {
  const adresse = `/site/${encodeURIComponent(pseudo)}`;
  return h(
    'a',
    { class: 'carte-site', href: adresse },
    h('div', { class: 'miniature' }, h('iframe', { src: adresse, sandbox: '', loading: 'lazy', tabindex: '-1', 'aria-hidden': 'true', title: '', referrerpolicy: 'no-referrer' })),
    h('div', { class: 'infos' }, h('strong', {}, titre), h('span', {}, `par ${pseudo} · ${new Date(publieLe).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`)),
  );
}

export async function chargerVitrine() {
  try {
    const r = await fetch('/api/vitrine', { credentials: 'same-origin' });
    return r.ok ? await r.json() : [];
  } catch {
    return [];
  }
}
