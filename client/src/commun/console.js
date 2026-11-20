// Mini-console sous l'aperçu : console.log de l'élève et erreurs expliquées en français.
import { h, prefs } from './dom.js';
import { traduireErreur } from './erreurs-fr.js';
import { localiser } from './apercu.js';

const ICONES = { log: '›', info: 'ℹ️', warn: '⚠️', error: '⛔' };
const NOMS_ONGLETS = { js: 'JS', html: 'HTML' };

/** @param {HTMLElement} bloc  l'élément .console (avec .lignes-console, .compteur-erreurs, .bascule-console, .vider-console) */
export function creerConsole(bloc, { cleOuverture = 'consoleOuverte' } = {}) {
  const lignes = bloc.querySelector('.lignes-console');
  const compteur = bloc.querySelector('.compteur-erreurs');
  const bascule = bloc.querySelector('.bascule-console');
  let nbErreurs = 0;

  const ouvrir = (ouvert) => {
    bloc.classList.toggle('repliee', !ouvert);
    bascule.setAttribute('aria-expanded', String(ouvert));
    prefs.ecrire(cleOuverture, ouvert);
  };
  ouvrir(prefs.lire(cleOuverture, true));
  bascule.addEventListener('click', () => ouvrir(bloc.classList.contains('repliee')));
  bloc.querySelector('.vider-console').addEventListener('click', () => effacer());

  let nbHtml = 0;
  function majCompteur() {
    const total = nbErreurs + nbHtml;
    compteur.hidden = total === 0;
    compteur.textContent = `${total} erreur${total > 1 ? 's' : ''}`;
  }

  /** Remarques du vérificateur HTML : toujours en haut de la console, remplacées à chaque frappe. */
  function remarquesHtml(liste) {
    lignes.querySelectorAll('.ligne-html').forEach((n) => n.remove());
    nbHtml = liste.filter((r) => r.gravite === 'erreur').length;
    majCompteur();
    const noeuds = liste.map((r) =>
      h(
        'div',
        { class: `ligne-console ligne-html ${r.gravite === 'erreur' ? 'niveau-error' : 'niveau-warn'}` },
        h('span', { class: 'icone-console', 'aria-hidden': 'true' }, r.gravite === 'erreur' ? '🧱' : '💡'),
        h('div', { class: 'texte-console erreur-expliquee' }, h('strong', {}, r.gravite === 'erreur' ? 'HTML' : 'Conseil HTML'), h('span', { class: 'lieu-erreur' }, ` ligne ${r.ligne}`), h('p', {}, r.message)),
      ),
    );
    lignes.prepend(...noeuds);
  }

  function ajouter(noeud) {
    const enBas = lignes.scrollHeight - lignes.scrollTop - lignes.clientHeight < 30;
    lignes.append(noeud);
    while (lignes.childElementCount > 200) lignes.firstElementChild.remove();
    if (enBas) lignes.scrollTop = lignes.scrollHeight;
  }

  function effacer() {
    // Les remarques HTML restent : elles ne dépendent pas de l'exécution de la page.
    [...lignes.children].forEach((n) => n.classList.contains('ligne-html') || n.remove());
    nbErreurs = 0;
    majCompteur();
  }

  /** Reçoit un message de la sonde. */
  function recevoir(msg, infos) {
    if (msg.type === 'console') {
      ajouter(h('div', { class: `ligne-console niveau-${msg.niveau}` }, h('span', { class: 'icone-console', 'aria-hidden': 'true' }, ICONES[msg.niveau] || '›'), h('span', { class: 'texte-console' }, msg.texte)));
    } else if (msg.type === 'erreur') {
      const { titre, aide, original } = traduireErreur(msg.message);
      const lieu = localiser(infos, msg.ligne);
      nbErreurs++;
      majCompteur();
      if (bloc.classList.contains('repliee')) ouvrir(true);
      ajouter(
        h(
          'div',
          { class: 'ligne-console niveau-error erreur-expliquee' },
          h('span', { class: 'icone-console', 'aria-hidden': 'true' }, '⛔'),
          h(
            'div',
            { class: 'texte-console' },
            h('strong', {}, titre),
            lieu && h('span', { class: 'lieu-erreur' }, ` ligne ${lieu.ligne} de ton ${NOMS_ONGLETS[lieu.onglet]}`),
            aide && h('p', {}, aide),
            original && h('code', { class: 'erreur-originale' }, original),
          ),
        ),
      );
    } else if (msg.type === 'ressource') {
      ajouter(
        h(
          'div',
          { class: 'ligne-console niveau-warn' },
          h('span', { class: 'icone-console', 'aria-hidden': 'true' }, '🖼️'),
          h('span', { class: 'texte-console' }, `Une image n’a pas pu se charger : « ${msg.adresse || '(adresse vide)'} ». Vérifie l’adresse : elle doit mener directement à une image.`),
        ),
      );
    } else if (msg.type === 'lien') {
      ajouter(
        h(
          'div',
          { class: 'ligne-console niveau-info' },
          h('span', { class: 'icone-console', 'aria-hidden': 'true' }, '🔗'),
          h('span', { class: 'texte-console' }, `Ton lien mène vers « ${msg.adresse} ». Dans l’aperçu on reste ici, mais sur ton site publié il marchera !`),
        ),
      );
    }
  }

  return { recevoir, effacer, remarquesHtml, aDesErreursJs: () => nbErreurs > 0 };
}
