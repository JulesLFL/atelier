// Animation de réussite : confettis + carte de victoire.
import { h } from '../commun/dom.js';

const BRAVOS = [
  'Propre. 😎',
  'Ça, c’est fait ! 💪',
  'Tu gères. 🔥',
  'Code validé, développeur confirmé. 🧑‍💻',
  'Même pas transpiré. 😏',
  'Un pas de plus vers ton site de rêve. 🚀',
  'Clean ! ✨',
  'GG ! 🎮',
];
const COULEURS = ['#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#38bdf8', '#fb923c'];

const mouvementReduit = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function confettis(nombre = 140) {
  if (mouvementReduit()) return;
  const toile = h('canvas', { class: 'confettis', 'aria-hidden': 'true' });
  document.body.append(toile);
  const ctx = toile.getContext('2d');
  const ratio = window.devicePixelRatio || 1;
  toile.width = innerWidth * ratio;
  toile.height = innerHeight * ratio;
  ctx.scale(ratio, ratio);
  const morceaux = Array.from({ length: nombre }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 200,
    y: innerHeight * 0.45,
    vx: (Math.random() - 0.5) * 16,
    vy: -Math.random() * 16 - 6,
    taille: 5 + Math.random() * 7,
    angle: Math.random() * Math.PI,
    rotation: (Math.random() - 0.5) * 0.3,
    couleur: COULEURS[Math.floor(Math.random() * COULEURS.length)],
  }));
  const debut = performance.now();
  (function image(t) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const vie = (t - debut) / 1000;
    for (const m of morceaux) {
      m.vy += 0.45;
      m.vx *= 0.99;
      m.x += m.vx;
      m.y += m.vy;
      m.angle += m.rotation;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - vie / 2.6);
      ctx.translate(m.x, m.y);
      ctx.rotate(m.angle);
      ctx.fillStyle = m.couleur;
      ctx.fillRect(-m.taille / 2, -m.taille / 4, m.taille, m.taille / 2);
      ctx.restore();
    }
    if (vie < 2.6) requestAnimationFrame(image);
    else toile.remove();
  })(debut);
}

/**
 * @param {{ titre: string, sousTitre?: string, suivant?: { texte: string, action: () => void }, grand?: boolean }} o
 */
export function celebrer({ titre, sousTitre, suivant, grand = false }) {
  document.querySelector('.victoire')?.remove();
  confettis(grand ? 260 : 140);
  const fermer = () => {
    carte.classList.add('sortie');
    setTimeout(() => carte.remove(), 250);
    document.removeEventListener('keydown', clavier);
  };
  const clavier = (e) => e.key === 'Escape' && fermer();
  const boutonSuivant = suivant && h('button', { class: 'bouton-principal', onclick: () => (fermer(), suivant.action()) }, suivant.texte);
  const carte = h(
    'div',
    { class: `victoire${grand ? ' victoire-grande' : ''}`, role: 'dialog', 'aria-live': 'assertive', 'aria-label': titre },
    h('div', { class: 'victoire-badge', 'aria-hidden': 'true' }, grand ? '🏆' : '✅'),
    h('h2', {}, titre),
    h('p', {}, sousTitre || BRAVOS[Math.floor(Math.random() * BRAVOS.length)]),
    h('div', { class: 'victoire-actions' }, h('button', { class: 'bouton-secondaire', onclick: fermer }, 'Rester ici'), boutonSuivant),
  );
  document.addEventListener('keydown', clavier);
  document.body.append(carte);
  (boutonSuivant || carte.querySelector('button')).focus({ preventScroll: true });
  return fermer;
}
