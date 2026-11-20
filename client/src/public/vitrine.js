import './commun.js';
import { h, vider } from '../commun/dom.js';
import { carteSite, chargerVitrine } from './cartes.js';

const grille = document.getElementById('grille-vitrine');
chargerVitrine().then((sites) => {
  vider(grille, sites.length ? sites.map(carteSite) : h('p', { class: 'vitrine-vide' }, 'Aucun site dans la vitrine pour le moment. Les premiers arrivent bientôt.'));
});
