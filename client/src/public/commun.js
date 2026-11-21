// Commun à toutes les pages publiques : polices, styles, thème clair/sombre, page active du menu.
import '../commun/polices.js';
import '../styles/base.css';
import '../styles/public.css';

const racine = document.documentElement;
const sombreSysteme = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
const themeActuel = () => racine.dataset.theme || (sombreSysteme() ? 'sombre' : 'clair');

function majBouton() {
  const b = document.querySelector('.bascule-theme');
  if (!b) return;
  const suivant = themeActuel() === 'sombre' ? 'clair' : 'sombre';
  b.setAttribute('aria-label', `Passer au thème ${suivant}`);
  b.title = `Passer au thème ${suivant}`;
}

// Changement de thème animé : le nouveau thème s'étend en cercle depuis le bouton
// (API View Transitions). Sinon, fondu des couleurs. Rien si l'appareil demande moins d'animations.
function changerTheme(bouton) {
  const nouveau = themeActuel() === 'sombre' ? 'clair' : 'sombre';
  const appliquer = () => {
    racine.dataset.theme = nouveau;
    try {
      localStorage.setItem('atelier:theme', nouveau);
    } catch {
      /* navigation privée : le choix ne sera pas retenu */
    }
    majBouton();
  };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return appliquer();

  bouton.classList.remove('tourne');
  void bouton.offsetWidth; // relance l'animation de l'icône
  bouton.classList.add('tourne');

  if (document.startViewTransition) {
    const r = bouton.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const rayon = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const transition = document.startViewTransition(appliquer);
    transition.ready
      .then(() =>
        racine.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rayon}px at ${x}px ${y}px)`] },
          { duration: 650, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' },
        ),
      )
      .catch(() => {});
  } else {
    racine.classList.add('transition-theme');
    appliquer();
    setTimeout(() => racine.classList.remove('transition-theme'), 500);
  }
}
document.querySelector('.bascule-theme')?.addEventListener('click', (e) => changerTheme(e.currentTarget));
majBouton();

// Lien du menu correspondant à la page actuelle
for (const a of document.querySelectorAll('.nav-publique a')) {
  if (a.getAttribute('href') === location.pathname) a.setAttribute('aria-current', 'page');
}

/** Données publiques du programme (modules et missions, sans les vérifications). */
export async function chargerProgramme() {
  try {
    const r = await fetch('/api/programme');
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}
