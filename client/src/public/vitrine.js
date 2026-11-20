import '@fontsource-variable/inter';
import '../styles/base.css';
import '../styles/eleve.css';
import '../styles/entree.css';
import '../styles/public.css';
import { h, vider } from '../commun/dom.js';
import { carteSite, chargerVitrine } from './cartes.js';

const grille = document.getElementById('grille-vitrine');
chargerVitrine().then((sites) => {
  vider(
    grille,
    sites.length
      ? sites.map(carteSite)
      : h('div', { class: 'vitrine-vide' }, h('div', { class: 'grand-emoji', 'aria-hidden': 'true' }, '🚧'), h('p', {}, 'Aucun site dans la vitrine pour le moment. Les premiers arrivent bientôt !')),
  );
});
