import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '../styles/base.css';
import '../styles/eleve.css';
import '../styles/public.css';
import { carteSite, chargerVitrine } from './cartes.js';

// Déjà connecté ? Les boutons mènent directement à l'atelier.
fetch('/api/eleve/session', { credentials: 'same-origin' })
  .then((r) => (r.ok ? r.json() : null))
  .then((s) => {
    if (!s?.connecte) return;
    document.getElementById('bouton-entete').textContent = `Mon atelier (${s.pseudo})`;
    document.querySelectorAll('a[href="/connexion"]').forEach((a) => (a.href = '/atelier'));
    document.getElementById('bouton-heros').textContent = 'Continuer mon site →';
  })
  .catch(() => {});

// Les 3 dernières créations de la vitrine (la section reste cachée s'il n'y en a pas).
chargerVitrine().then((sites) => {
  if (!sites.length) return;
  document.getElementById('apercu-vitrine').append(...sites.slice(0, 3).map(carteSite));
  document.getElementById('section-vitrine').hidden = false;
});
