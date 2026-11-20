// Notifications discrètes (en haut à droite) et fenêtres de confirmation.
import { h } from './dom.js';

let zone = null;
function zoneNotifs() {
  zone ??= document.getElementById('notifications') || document.body.appendChild(h('div', { class: 'notifications', 'aria-live': 'polite' }));
  return zone;
}

/**
 * @param {{ icone?: string, titre?: string, texte: string, type?: 'info'|'succes'|'indice'|'erreur', duree?: number, surFermeture?: () => void }} o
 */
export function notifier({ icone = '💬', titre, texte, type = 'info', duree = 8000, surFermeture }) {
  const fermer = () => {
    if (!notif.isConnected) return;
    notif.classList.add('sortie');
    setTimeout(() => notif.remove(), 250);
    surFermeture?.();
  };
  const notif = h(
    'div',
    { class: `notif notif-${type}`, role: type === 'erreur' ? 'alert' : 'status' },
    h('span', { class: 'notif-icone', 'aria-hidden': 'true' }, icone),
    h('div', { class: 'notif-corps' }, titre && h('strong', {}, titre), h('p', {}, texte)),
    h('button', { class: 'notif-fermer', 'aria-label': 'Fermer', onclick: fermer }, '×'),
  );
  zoneNotifs().append(notif);
  if (duree) setTimeout(fermer, duree);
  return fermer;
}

/** Fenêtre modale. Renvoie une promesse : true si on confirme. */
export function confirmer({ titre, texte, ok = 'OK', annuler = 'Annuler', danger = false }) {
  return new Promise((resoudre) => {
    const precedent = document.activeElement;
    const fermer = (valeur) => {
      fond.remove();
      document.removeEventListener('keydown', clavier);
      precedent?.focus?.();
      resoudre(valeur);
    };
    const clavier = (e) => e.key === 'Escape' && fermer(false);
    const boutonOk = h('button', { class: danger ? 'bouton-danger' : 'bouton-principal', onclick: () => fermer(true) }, ok);
    const fond = h(
      'div',
      { class: 'fond-modal', onclick: (e) => e.target === fond && fermer(false) },
      h(
        'div',
        { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'titre-modal' },
        h('h2', { id: 'titre-modal' }, titre),
        texte && h('p', {}, texte),
        h('div', { class: 'modal-actions' }, annuler && h('button', { class: 'bouton-secondaire', onclick: () => fermer(false) }, annuler), boutonOk),
      ),
    );
    document.addEventListener('keydown', clavier);
    document.body.append(fond);
    boutonOk.focus();
  });
}

/** Fenêtre qui affiche du contenu libre (nœuds DOM). */
export function fenetre(titre, ...contenu) {
  const precedent = document.activeElement;
  const fermer = () => {
    fond.remove();
    document.removeEventListener('keydown', clavier);
    precedent?.focus?.();
  };
  const clavier = (e) => e.key === 'Escape' && fermer();
  const boutonFermer = h('button', { class: 'bouton-secondaire', onclick: fermer }, 'Fermer');
  const fond = h(
    'div',
    { class: 'fond-modal', onclick: (e) => e.target === fond && fermer() },
    h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titre }, h('h2', {}, titre), ...contenu, h('div', { class: 'modal-actions' }, boutonFermer)),
  );
  document.addEventListener('keydown', clavier);
  document.body.append(fond);
  boutonFermer.focus();
  return fermer;
}
