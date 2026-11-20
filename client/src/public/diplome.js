// Diplôme de fin de parcours : visible par l'élève quand toutes les missions obligatoires sont réussies.
import './commun.js';
import { h, vider } from '../commun/dom.js';
import { compterProgression } from '@partage/regles.js';
import { LOGO_SVG } from '../commun/logo.js';

const zone = document.getElementById('diplome');
Promise.all([fetch('/api/eleve/etat'), fetch('/api/missions')])
  .then(async ([e, m]) => {
    if (e.status === 401) return location.replace('/connexion');
    const etat = await e.json();
    const catalogue = await m.json();
    const { faites, total, bonusFaits, bonusTotal } = compterProgression(etat.etat);
    if (faites < total) {
      vider(
        zone,
        h('header', { class: 'entete-page' }, h('p', { class: 'etiquette-code' }, '// diplôme'), h('h1', {}, 'Ton diplôme t’attend'), h('p', {}, `Encore ${total - faites} mission${total - faites > 1 ? 's' : ''} avant de le débloquer. Tu en as déjà réussi ${faites} sur ${total} !`)),
        h('a', { class: 'bouton-principal', href: '/atelier' }, 'Retour à l’atelier'),
      );
      return;
    }
    const derniere = Math.max(...Object.values(etat.progression).map((p) => p.reussieLe || 0));
    const logo = h('span', { class: 'logo logo-diplome' });
    logo.innerHTML = LOGO_SVG; // contenu fixe du logo
    vider(
      zone,
      h(
        'article',
        { class: 'diplome' },
        logo,
        h('p', { class: 'etiquette-code' }, '// L’Atelier décerne ce diplôme à'),
        h('h1', { class: 'nom-diplome' }, etat.eleve.pseudo),
        h('p', { class: 'motif' }, 'pour avoir codé son propre site web de A à Z, en HTML, en CSS et en JavaScript.'),
        h(
          'ul',
          { class: 'stats-diplome' },
          h('li', {}, h('strong', {}, total), ' missions réussies'),
          h('li', {}, h('strong', {}, `${bonusFaits}/${bonusTotal}`), ' défis bonus'),
          h('li', {}, h('strong', {}, etat.badges.length), ` badges sur ${catalogue.badges.length}`),
        ),
        h('p', { class: 'date-diplome' }, `Le ${new Date(derniere || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`),
        h('p', { class: 'signature' }, 'Le mentor de l’Atelier'),
      ),
      h('p', { class: 'actions centre-diplome' }, h('button', { class: 'bouton-principal', onclick: () => window.print() }, 'Imprimer mon diplôme'), h('a', { class: 'lien-fleche', href: '/atelier' }, 'Retour à l’atelier')),
    );
  })
  .catch(() => vider(zone, h('p', {}, 'Le diplôme n’a pas pu être chargé.')));
