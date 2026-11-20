// Cartes de la vitrine : miniature du site (iframe SANS script : sandbox="") + titre + pseudo + « Signaler ».
import { h } from '../commun/dom.js';

const CONTACT = 'jules.lfl.pro@proton.me';

export function carteSite({ pseudo, titre, publieLe }) {
  const adresse = `/site/${encodeURIComponent(pseudo)}`;
  const urlComplete = `${location.origin}${adresse}`;
  const sujet = encodeURIComponent(`Signalement : ${urlComplete}`);
  const corps = encodeURIComponent(`Bonjour,\n\nJe souhaite signaler le site ${urlComplete} pour la raison suivante :\n\n`);
  return h(
    'article',
    { class: 'carte-site' },
    h('div', { class: 'miniature' }, h('iframe', { src: adresse, sandbox: '', loading: 'lazy', tabindex: '-1', 'aria-hidden': 'true', title: '', referrerpolicy: 'no-referrer' })),
    h(
      'div',
      { class: 'infos' },
      h('a', { class: 'lien-site titre-site', href: adresse }, titre),
      h('span', {}, `par ${pseudo} · ${new Date(publieLe).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`),
    ),
    h('a', { class: 'signaler', href: `mailto:${CONTACT}?subject=${sujet}&body=${corps}` }, 'Signaler ce site'),
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
