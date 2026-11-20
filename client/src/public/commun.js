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

document.querySelector('.bascule-theme')?.addEventListener('click', () => {
  const nouveau = themeActuel() === 'sombre' ? 'clair' : 'sombre';
  racine.dataset.theme = nouveau;
  try {
    localStorage.setItem('atelier:theme', nouveau);
  } catch {
    /* navigation privée : le choix ne sera pas retenu */
  }
  majBouton();
});
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
