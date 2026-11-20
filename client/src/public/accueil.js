import { chargerProgramme } from './commun.js';
import { h, vider } from '../commun/dom.js';
import { carteSite, chargerVitrine } from './cartes.js';

// --- Démo : le code est tapé lettre par lettre, la page se construit à côté ---------
const ETAPES = [
  { code: '<h1>Le repaire des gamers</h1>\n', rendu: () => h('h3', { class: 'apparait' }, 'Le repaire des gamers') },
  { code: '<p>Mes jeux et mes astuces.</p>\n', rendu: () => h('p', { class: 'apparait' }, 'Mes jeux et mes astuces.') },
  { code: '<ul>\n  <li>Minecraft</li>\n', rendu: () => h('ul', { class: 'apparait', id: 'demo-liste' }, h('li', {}, 'Minecraft')) },
  { code: '  <li>Celeste</li>\n</ul>', rendu: () => document.getElementById('demo-liste')?.append(h('li', { class: 'apparait' }, 'Celeste')) },
];
const echapper = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Coloration minimale du HTML (le texte est fixe, écrit ci-dessus : aucune donnée extérieure).
const colorer = (s) => echapper(s).replace(/(&lt;\/?)(\w+)(&gt;)?/g, '<span class="b">$1$2$3</span>');

async function demo() {
  const pre = document.getElementById('demo-code');
  const rendu = document.getElementById('demo-rendu');
  const coche = document.getElementById('demo-coche');
  if (!pre || !rendu) return;
  const lent = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let tape = '';
  const afficher = (avecCurseur) => (pre.innerHTML = colorer(tape) + (avecCurseur ? '<span class="curseur"></span>' : ''));
  for (const etape of ETAPES) {
    if (lent) {
      for (const c of etape.code) {
        tape += c;
        afficher(true);
        await new Promise((r) => setTimeout(r, c === '\n' ? 160 : 42));
      }
    } else tape += etape.code;
    const noeud = etape.rendu();
    if (noeud instanceof Node) rendu.append(noeud);
  }
  afficher(lent);
  coche?.classList.add('visible');
}
new IntersectionObserver((entrees, obs) => {
  if (entrees.some((e) => e.isIntersecting)) {
    obs.disconnect();
    setTimeout(demo, 400);
  }
}).observe(document.getElementById('demo-live'));

// --- Programme : les chiffres viennent du vrai catalogue de missions ---------------------
chargerProgramme().then((p) => {
  if (!p) return;
  const obligatoires = p.missions.filter((m) => !m.bonus);
  const defis = p.missions.filter((m) => m.bonus);
  document.querySelectorAll('[data-nb-missions]').forEach((el) => (el.textContent = obligatoires.length));
  document.querySelectorAll('[data-nb-defis]').forEach((el) => (el.textContent = defis.length));
  const conteneur = document.getElementById('lignes-modules');
  vider(
    conteneur,
    p.modules.map((mod) => {
      const missions = obligatoires.filter((m) => m.module === mod.id);
      const nbDefis = defis.filter((m) => m.module === mod.id).length;
      return h(
        'div',
        { class: `ligne-module ${mod.id}` },
        h('h3', {}, mod.titre),
        h('span', { class: 'compte' }, `${missions.length} missions + ${nbDefis} défis`),
        h('p', {}, `${mod.sousTitre}. Par exemple : ${missions.slice(0, 3).map((m) => `« ${m.titre} »`).join(', ')}…`),
      );
    }),
  );
});

// --- Dernières créations de la vitrine --------------------------------------------------
chargerVitrine().then((sites) => {
  if (!sites.length) return;
  document.getElementById('apercu-vitrine').append(...sites.slice(0, 3).map(carteSite));
  document.getElementById('section-vitrine').hidden = false;
});

// --- Élève déjà connecté : les boutons mènent à son atelier ----------------------------------
fetch('/api/eleve/session')
  .then((r) => (r.ok ? r.json() : null))
  .then((s) => {
    if (!s?.connecte) return;
    document.querySelectorAll('a[href="/connexion"]').forEach((a) => {
      a.href = '/atelier';
      if (a.classList.contains('bouton-connexion')) a.textContent = 'Mon atelier';
    });
    const b = document.getElementById('bouton-heros');
    if (b) b.textContent = 'Continuer mon site';
  })
  .catch(() => {});
