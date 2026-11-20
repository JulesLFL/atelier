import { chargerProgramme } from './commun.js';
import { h, vider } from '../commun/dom.js';

const conteneur = document.getElementById('programme');
chargerProgramme().then((p) => {
  if (!p) return vider(conteneur, h('p', {}, 'Le programme n’a pas pu être chargé. Réessaie dans un instant.'));
  vider(
    conteneur,
    p.modules.map((mod) => {
      const missions = p.missions.filter((m) => m.module === mod.id && !m.bonus);
      const defis = p.missions.filter((m) => m.module === mod.id && m.bonus);
      const ligne = (m, n, defi) => h('li', { class: defi ? 'defi' : '' }, h('span', { class: 'n' }, defi ? '⭐' : String(n).padStart(2, '0')), h('span', { class: 't' }, m.titre), h('span', { class: 'o' }, m.objectif));
      return h(
        'section',
        { class: `module-programme ${mod.id}`, id: mod.id },
        h('h2', {}, mod.titre, h('small', {}, `${missions.length} missions · ${defis.length} défis`)),
        h('p', {}, mod.sousTitre),
        h('ol', { class: 'liste-missions' }, missions.map((m, i) => ligne(m, i + 1, false)), defis.map((m) => ligne(m, 0, true))),
      );
    }),
  );
});
