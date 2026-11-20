import './commun.js';
import { h, vider } from '../commun/dom.js';

const TYPES = { nouveau: 'Nouveau', amelioration: 'Amélioré', correction: 'Corrigé', securite: 'Sécurité' };
const liste = document.getElementById('journal');
fetch('/api/journal')
  .then((r) => r.json())
  .then((entrees) =>
    vider(
      liste,
      entrees.map((e) =>
        h(
          'li',
          { class: 'entree-journal', id: `v${e.version}` },
          h('p', { class: 'quand' }, h('strong', {}, `v${e.version}`), new Date(e.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })),
          h(
            'div',
            {},
            h('h2', {}, e.titre),
            e.resume && h('p', { class: 'resume' }, e.resume),
            h('ul', { class: 'changements' }, e.changements.map((c) => h('li', {}, h('span', { class: `type-changement type-${c.type}` }, TYPES[c.type] || c.type), h('span', {}, c.texte)))),
          ),
        ),
      ),
    ),
  )
  .catch(() => vider(liste, h('li', {}, 'Le journal n’a pas pu être chargé.')));
