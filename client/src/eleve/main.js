// L'atelier de l'élève : éditeur + aperçu + missions + temps réel.
import '../commun/polices.js';
import '../styles/base.css';
import '../styles/eleve.css';
import { io } from 'socket.io-client';
import { api } from '../commun/api.js';
import { h, vider, debounce, prefs } from '../commun/dom.js';
import { creerEditeur } from '../commun/editeur.js';
import { creerApercu } from '../commun/apercu.js';
import { notifier, confirmer, fenetre } from '../commun/notifications.js';
import { creerConsole } from '../commun/console.js';
import { celebrer } from './celebration.js';
import { rendreMission, rendreParcours, rendreMemo, majChecklist, annoncerDeblocage } from './panneaux.js';
import { annoncerBadges, ouvrirBadges, lancerQuiz, ouvrirMonSite, afficherCharte } from './extras.js';
import { compterProgression } from '@partage/regles.js';
import { verifierHtml } from '@partage/verif-html.js';

const LANGAGES = ['html', 'css', 'js'];
const FICHIERS = { html: 'index.html', css: 'style.css', js: 'script.js' };
const DELAI_APERCU_MS = 300;

// --------------------------------------------------------------------------
//  État de l'écran
// --------------------------------------------------------------------------
const S = {
  catalogue: null,
  eleve: null,
  etat: null, // { modules, missions, onglets }
  progression: {},
  missionCourante: null,
  resultats: null,
  mode: prefs.lire('mode', 'missions'),
  panneau: 'mission',
  ongletActif: 'html',
  messages: [],
  publication: null,
  badges: [],
  visites: 0,
  accords: { publication: null, vitrine: null },
  ecran: prefs.lire('ecran', 'ordinateur'),
};

let editeurs = {};
let socket;
let apercu;
let console_;
let modifieNonEnvoye = false;
let succesEnCours = false;
// Pour le badge « Chasseur de bugs » : une erreur JS au rechargement précédent, plus aucune maintenant.
let erreurAvant = false;
let erreurMaintenant = false;

// --------------------------------------------------------------------------
//  Démarrage
// --------------------------------------------------------------------------
async function demarrer() {
  let donnees;
  try {
    [donnees, S.catalogue] = await Promise.all([api('GET', '/api/eleve/etat'), api('GET', '/api/missions')]);
  } catch (e) {
    if (e.statut === 401) return location.replace('/connexion');
    document.body.prepend(h('div', { class: 'bandeau-erreur', role: 'alert' }, `Impossible de charger l’atelier : ${e.message}`));
    return;
  }
  appliquerEtat(donnees, { silencieux: true });
  S.messages = donnees.messagesNonLus || [];
  document.getElementById('pseudo').textContent = `👤 ${S.eleve.pseudo}`;

  appliquerTaillePolice(prefs.lire('taillePolice', 16));
  console_ = creerConsole(document.getElementById('console'));
  apercu = creerApercu(document.getElementById('cadre-apercu'), {
    surMessage: (msg, infos) => {
      if (msg.type === 'erreur') erreurMaintenant = true;
      if (msg.type === 'pret') setTimeout(() => erreurAvant && !erreurMaintenant && socket?.emit('badge:evenement', 'chasseur-de-bugs'), 800);
      console_.recevoir(msg, infos);
    },
    surRechargement: () => {
      erreurAvant = erreurMaintenant;
      erreurMaintenant = false;
      console_.effacer();
    },
  });

  creerEditeurs(donnees.code);
  brancherInterface();
  connecterTempsReel();
  rendreTout();
  actualiser({ sauvegarder: false });

  // Première connexion : la charte, une seule fois.
  if (!donnees.charteAcceptee) await afficherCharte(() => new Promise((ok) => socket.emit('charte:accepter', ok)));
  S.charteOk = true;

  // L'élève peut taper tout de suite : curseur à la fin du HTML.
  const html = editeurs.html;
  html.vue.dispatch({ selection: { anchor: html.vue.state.doc.length } });
  html.focus();

  for (const m of S.messages) afficherMessage(m);
  majPastille();
}

function appliquerEtat(donnees, { silencieux = false } = {}) {
  const anciensOnglets = S.etat?.onglets || [];
  S.eleve = donnees.eleve;
  S.etat = donnees.etat;
  S.progression = donnees.progression || {};
  S.publication = donnees.publication;
  S.badges = donnees.badges || S.badges;
  S.visites = donnees.visites ?? S.visites;
  S.accords = donnees.accords ?? S.accords;
  if (donnees.missionCourante !== undefined && donnees.missionCourante !== S.missionCourante) {
    S.missionCourante = donnees.missionCourante;
    S.resultats = null;
  }
  if (!silencieux) {
    for (const id of S.etat.onglets) {
      if (!anciensOnglets.includes(id)) annoncerDeblocage(S.catalogue.modules.find((m) => m.id === id));
    }
  }
}

// --------------------------------------------------------------------------
//  Éditeurs
// --------------------------------------------------------------------------
const actualiserPlusTard = debounce(() => actualiser(), DELAI_APERCU_MS);

function creerEditeurs(code) {
  const conteneur = document.getElementById('editeurs');
  for (const langage of LANGAGES) {
    const zone = h('div', { class: 'editeur', id: `editeur-${langage}`, role: 'tabpanel', 'aria-labelledby': `onglet-${langage}`, hidden: true });
    conteneur.append(zone);
    editeurs[langage] = creerEditeur(zone, langage, {
      doc: code?.[langage] ?? '',
      surChangement: () => {
        modifieNonEnvoye = true;
        majSauvegarde('modifie');
        actualiserPlusTard();
      },
    });
  }
}

function codeActuel() {
  return Object.fromEntries(LANGAGES.map((l) => [l, editeurs[l].texte()]));
}

/** Met à jour l'aperçu, sauvegarde et vérifie la mission. */
function actualiser({ sauvegarder = true } = {}) {
  const code = codeActuel();
  apercu.mettreAJour(code, S.etat.onglets);
  const remarques = verifierHtml(code.html);
  console_.remarquesHtml(remarques);
  editeurs.html.remarques(remarques);
  if (sauvegarder) envoyerCode(code);
  verifierMission(code);
}

function rendreOngletsCode() {
  const barre = document.getElementById('onglets-code');
  if (!S.etat.onglets.includes(S.ongletActif)) S.ongletActif = 'html';
  vider(
    barre,
    S.etat.onglets.map((l) =>
      h(
        'button',
        {
          role: 'tab',
          id: `onglet-${l}`,
          class: `onglet-code langage-${l}${prefs.lire(`ongletVu:${l}`, l === 'html') ? '' : ' nouveau'}`,
          'aria-selected': String(l === S.ongletActif),
          'aria-controls': `editeur-${l}`,
          onclick: () => choisirOnglet(l),
        },
        h('span', { class: 'pastille-langage', 'aria-hidden': 'true' }),
        FICHIERS[l],
      ),
    ),
  );
  for (const l of LANGAGES) document.getElementById(`editeur-${l}`).hidden = l !== S.ongletActif;
}

function choisirOnglet(langage) {
  S.ongletActif = langage;
  prefs.ecrire(`ongletVu:${langage}`, true);
  rendreOngletsCode();
  editeurs[langage].mesurer();
  editeurs[langage].focus();
}

function inserer(langage, code) {
  if (!S.etat.onglets.includes(langage)) return;
  choisirOnglet(langage);
  editeurs[langage].inserer(code);
}

// --------------------------------------------------------------------------
//  Missions
// --------------------------------------------------------------------------
function missionEnCours() {
  return S.catalogue.missions.find((m) => m.id === S.missionCourante);
}

async function verifierMission(code = codeActuel()) {
  const mission = missionEnCours();
  if (S.mode !== 'missions' || !mission) return;
  const resultats = await apercu.verifier(code, S.etat.onglets, mission.verifications);
  if (!resultats || mission.id !== S.missionCourante) return;
  S.resultats = resultats;
  majChecklist(resultats);
  const statut = S.etat.missions.find((m) => m.id === mission.id)?.statut;
  if (resultats.every(Boolean) && statut === 'disponible' && !succesEnCours) missionReussie(mission);
}

function missionReussie(mission) {
  succesEnCours = true;
  socket.emit('mission:reussie', mission.id, (reponse) => {
    succesEnCours = false;
    if (!reponse?.ok) return;
    appliquerEtat(reponse.etat);
    // On reste sur la mission réussie (l'élève choisit de passer à la suite).
    S.missionCourante = mission.id;
    rendreTout();
    feterReussite(mission);
    // Les badges arrivent juste après la célébration de la mission.
    setTimeout(() => annoncerBadges(reponse.badges), 1200);
  });
}

function suivante(missionId) {
  const ordre = S.catalogue.missions.map((m) => m.id);
  const statuts = Object.fromEntries(S.etat.missions.map((m) => [m.id, m.statut]));
  const bonus = new Set(S.catalogue.missions.filter((m) => m.bonus).map((m) => m.id));
  const dispo = (id) => id !== missionId && statuts[id] === 'disponible';
  // D'abord une mission obligatoire après celle-ci, puis n'importe quelle obligatoire, puis un défi bonus.
  return (
    ordre.slice(ordre.indexOf(missionId) + 1).find((id) => dispo(id) && !bonus.has(id)) ||
    ordre.find((id) => dispo(id) && !bonus.has(id)) ||
    ordre.find((id) => dispo(id)) ||
    null
  );
}

function feterReussite(mission) {
  const duModule = S.catalogue.missions.filter((m) => m.module === mission.module && !m.bonus);
  const statuts = Object.fromEntries(S.etat.missions.map((m) => [m.id, m.statut]));
  const moduleFini = !mission.bonus && duModule.every((m) => statuts[m.id] === 'reussie');
  const module = S.catalogue.modules.find((m) => m.id === mission.module);
  const idSuivante = suivante(mission.id);
  const suivanteEstBonus = S.catalogue.missions.find((m) => m.id === idSuivante)?.bonus;
  const { faites, total } = compterProgression(S.etat);
  const toutFini = faites === total;

  if (mission.bonus) {
    celebrer({ grand: true, titre: 'Défi bonus réussi ! ⭐', sousTitre: 'Là, tu dépasses le programme. Chapeau. 🎩', suivant: idSuivante && { texte: suivanteEstBonus ? '⭐ Défi suivant →' : 'Mission suivante →', action: () => choisirMission(idSuivante) } });
  } else if (toutFini && !idSuivante) {
    celebrer({ grand: true, titre: 'Toutes les missions sont réussies !', sousTitre: 'Tu as construit ton site de A à Z. Respect total. 🏆 Ton diplôme t’attend !', suivant: { texte: '🎓 Voir mon diplôme', action: () => window.open('/diplome', '_blank', 'noopener') } });
  } else if (moduleFini) {
    celebrer({
      grand: true,
      titre: `Module ${module.titre} terminé !`,
      sousTitre: suivanteEstBonus
        ? 'Deux défis bonus ⭐ viennent de s’ouvrir, pour ceux qui en veulent encore. 😏'
        : idSuivante
          ? 'La suite t’attend. 🚀'
          : 'Ton mentor va bientôt te débloquer la suite. En attendant, amuse-toi en Bac à sable 🧪',
      suivant: idSuivante ? { texte: suivanteEstBonus ? '⭐ Voir les défis →' : 'Mission suivante →', action: () => choisirMission(idSuivante) } : { texte: '🧪 Bac à sable', action: () => changerMode('libre') },
    });
  } else {
    celebrer({ titre: 'Mission réussie !', suivant: idSuivante && { texte: 'Mission suivante →', action: () => choisirMission(idSuivante) } });
  }
}

function choisirMission(id) {
  if (!id) return;
  socket.emit('mission:choisir', id, (reponse) => {
    if (!reponse?.ok) return notifier({ icone: '🔒', texte: 'Cette mission est encore verrouillée.', duree: 4000 });
    S.missionCourante = id;
    S.resultats = null;
    if (S.mode !== 'missions') changerMode('missions');
    choisirPanneau('mission');
    rendreTout();
    document.getElementById('panneau-mission').scrollTop = 0;
    verifierMission();
  });
}

async function reinitialiserMission() {
  const mission = missionEnCours();
  if (!mission) return;
  const ok = await confirmer({
    titre: 'Réinitialiser la mission ?',
    texte: `Ton code va revenir à ce qu’il était au début de la mission « ${mission.titre} ». Pas de panique : tu pourras annuler avec Ctrl+Z.`,
    ok: '⟲ Réinitialiser',
  });
  if (!ok) return;
  socket.emit('mission:reinitialiser', mission.id, (reponse) => {
    if (!reponse?.ok) return notifier({ icone: '🤷', texte: 'Pas de sauvegarde du début de cette mission.', duree: 4000 });
    for (const l of LANGAGES) editeurs[l].remplacer(reponse.code[l]);
    notifier({ icone: '⟲', texte: 'Mission réinitialisée. Ctrl+Z pour annuler.', duree: 4000 });
  });
}

// --------------------------------------------------------------------------
//  Rendu des panneaux
// --------------------------------------------------------------------------
const actionsPanneaux = {
  choisirMission,
  suivante,
  inserer,
  ongletOuvert: (l) => S.etat.onglets.includes(l),
  indiceRevele: (missionId, niveau) => {
    S.progression[missionId] = { ...(S.progression[missionId] || {}), indices: niveau };
    socket.emit('indice:revele', { missionId, niveau });
  },
  changerMode: (m) => changerMode(m),
};

function rendreTout() {
  const { faites, total, bonusFaits, bonusTotal } = compterProgression(S.etat);
  document.getElementById('compteur-missions').textContent = `${faites} / ${total}`;
  document.getElementById('jauge').style.width = `${total ? (faites / total) * 100 : 0}%`;
  document.getElementById('compteur-bonus').textContent = bonusFaits ? `⭐ ${bonusFaits}/${bonusTotal}` : '';
  document.getElementById('compteur-badges').textContent = S.badges.length;
  document.getElementById('cadre-apercu').classList.toggle('ecran-telephone', S.ecran === 'telephone');
  document.querySelectorAll('.bascule-ecran [data-ecran]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.ecran === S.ecran)));

  document.body.dataset.mode = S.mode;
  document.querySelectorAll('.bascule-mode [data-mode]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === S.mode)));
  document.querySelectorAll('.onglets-panneau [data-panneau]').forEach((b) => {
    b.hidden = S.mode === 'libre' && b.dataset.panneau !== 'memo';
  });
  if (S.mode === 'libre') S.panneau = 'memo';
  choisirPanneau(S.panneau);
  document.getElementById('bouton-reinitialiser').hidden = S.mode !== 'missions' || !missionEnCours();

  rendreOngletsCode();
  rendreMission(document.getElementById('panneau-mission'), S, actionsPanneaux);
  rendreParcours(document.getElementById('panneau-parcours'), S, actionsPanneaux);
  rendreMemo(document.getElementById('panneau-memo'), S, actionsPanneaux);
}

function choisirPanneau(nom) {
  S.panneau = nom;
  document.querySelectorAll('.onglets-panneau [data-panneau]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.panneau === nom)));
  for (const p of ['mission', 'parcours', 'memo']) document.getElementById(`panneau-${p}`).hidden = p !== nom;
}

function changerMode(mode) {
  if (mode === 'libre' && S.mode !== 'libre') socket?.emit('badge:evenement', 'explorateur');
  S.mode = mode;
  prefs.ecrire('mode', mode);
  if (mode === 'missions') S.panneau = 'mission';
  rendreTout();
  if (mode === 'missions') verifierMission();
}

// --------------------------------------------------------------------------
//  Barre du haut : mode, taille du code, messages
// --------------------------------------------------------------------------
function appliquerTaillePolice(taille) {
  const t = Math.min(26, Math.max(12, taille));
  document.documentElement.style.setProperty('--taille-code', `${t}px`);
  prefs.ecrire('taillePolice', t);
  Object.values(editeurs).forEach((e) => e.mesurer());
  return t;
}

function brancherInterface() {
  document.querySelectorAll('.bascule-mode [data-mode]').forEach((b) => b.addEventListener('click', () => changerMode(b.dataset.mode)));
  document.querySelectorAll('.onglets-panneau [data-panneau]').forEach((b) => b.addEventListener('click', () => choisirPanneau(b.dataset.panneau)));
  document.getElementById('police-moins').addEventListener('click', () => appliquerTaillePolice(prefs.lire('taillePolice', 16) - 2));
  document.getElementById('police-plus').addEventListener('click', () => appliquerTaillePolice(prefs.lire('taillePolice', 16) + 2));
  document.getElementById('bouton-annuler').addEventListener('click', () => editeurs[S.ongletActif].annuler());
  document.getElementById('bouton-retablir').addEventListener('click', () => editeurs[S.ongletActif].retablir());
  document.getElementById('bouton-reinitialiser').addEventListener('click', reinitialiserMission);
  document.getElementById('bouton-messages').addEventListener('click', ouvrirMessages);
  document.getElementById('bouton-badges').addEventListener('click', () => ouvrirBadges(S.catalogue.badges, S.badges));
  const demander = (evt, donnees) => new Promise((ok) => (donnees === undefined ? socket.emit(evt, ok) : socket.emit(evt, donnees, ok)));
  document.getElementById('bouton-mon-site').addEventListener('click', () =>
    ouvrirMonSite({
      publication: S.publication,
      visites: S.visites,
      pseudo: S.eleve.pseudo,
      accords: S.accords,
      demander: (vitrine) => demander('publication:demander', { vitrine }),
      retirer: () => demander('publication:retirer'),
      accordVitrine: (oui) => demander('vitrine:accord', oui),
    }),
  );
  document.querySelectorAll('.bascule-ecran [data-ecran]').forEach((b) =>
    b.addEventListener('click', () => {
      S.ecran = b.dataset.ecran;
      prefs.ecrire('ecran', S.ecran);
      rendreTout();
    }),
  );

  // Sauvegarde de secours quand on ferme l'onglet.
  window.addEventListener('pagehide', () => {
    if (!modifieNonEnvoye) return;
    fetch('/api/eleve/projet', { method: 'PUT', keepalive: true, headers: { 'Content-Type': 'application/json', 'X-Atelier': '1' }, body: JSON.stringify(codeActuel()) });
  });

  // Temps actif : on signale toutes les 30 s si l'élève a tapé ou bougé la souris récemment.
  let derniereInteraction = Date.now();
  const noter = () => (derniereInteraction = Date.now());
  for (const evt of ['keydown', 'pointerdown', 'wheel']) document.addEventListener(evt, noter, { passive: true, capture: true });
  setInterval(() => {
    if (document.visibilityState === 'visible' && Date.now() - derniereInteraction < 90_000) socket?.emit('activite');
  }, 30_000);
}

// --------------------------------------------------------------------------
//  Messages du mentor
// --------------------------------------------------------------------------
function afficherMessage(m) {
  const indice = m.type === 'indice';
  notifier({
    icone: indice ? '💡' : '💬',
    titre: indice ? 'Indice de ton mentor' : 'Message de ton mentor',
    texte: m.texte,
    type: indice ? 'indice' : 'info',
    duree: indice ? 0 : 20000,
    surFermeture: () => marquerLu(m),
  });
}

function marquerLu(m) {
  if (m.lu_le) return;
  m.lu_le = Date.now();
  socket?.emit('message:lu', m.id);
  majPastille();
}

function majPastille() {
  const n = S.messages.filter((m) => !m.lu_le).length;
  const p = document.getElementById('pastille-messages');
  p.hidden = n === 0;
  p.textContent = n;
}

function ouvrirMessages() {
  const liste = S.messages.length
    ? h(
        'ul',
        { class: 'liste-messages' },
        [...S.messages].reverse().map((m) => h('li', { class: `message-${m.type}` }, h('span', { 'aria-hidden': 'true' }, m.type === 'indice' ? '💡' : '💬'), h('p', {}, m.texte), h('time', {}, new Date(m.envoye_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })))),
      )
    : h('p', {}, 'Pas encore de message de ton mentor pendant cette séance.');
  fenetre('Messages de ton mentor', liste);
  S.messages.forEach(marquerLu);
}

// --------------------------------------------------------------------------
//  Temps réel et sauvegarde
// --------------------------------------------------------------------------
function majSauvegarde(etat) {
  const el = document.getElementById('etat-sauvegarde');
  const textes = { ok: '✓ Enregistré', modifie: '● Modifié', envoi: '↻ Enregistrement…', horsLigne: '⚠ Hors ligne' };
  el.textContent = textes[etat];
  el.dataset.etat = etat;
}

function envoyerCode(code) {
  if (!socket?.connected) return majSauvegarde('horsLigne');
  majSauvegarde('envoi');
  socket.emit('code:maj', code, (r) => {
    if (r?.ok) {
      modifieNonEnvoye = false;
      majSauvegarde('ok');
    } else {
      notifier({ icone: '⚠️', texte: r?.erreur || 'Sauvegarde impossible.', type: 'erreur' });
    }
  });
}

function ouvrirQuiz(quiz, options) {
  lancerQuiz(quiz, (reponses) => new Promise((ok) => socket.emit('quiz:repondre', { id: quiz.id, reponses }, ok)), options);
}

function sessionTerminee() {
  socket?.disconnect();
  document.body.append(
    h(
      'div',
      { class: 'fond-modal' },
      h('div', { class: 'modal', role: 'alertdialog' }, h('h2', {}, '🔒 Session terminée'), h('p', {}, 'Ton lien d’accès a changé. Demande le nouveau à ton mentor.'), h('div', { class: 'modal-actions' }, h('a', { class: 'bouton-principal', href: '/connexion' }, 'Entrer un code'))),
    ),
  );
}

function connecterTempsReel() {
  socket = io('/eleve', { transports: ['websocket', 'polling'] });
  let quizDemande = false;
  socket.on('connect', () => {
    // Après une coupure, on renvoie le code s'il a changé entre-temps.
    if (modifieNonEnvoye) envoyerCode(codeActuel());
    else majSauvegarde('ok');
    // Quiz d'échauffement : le serveur décide s'il en propose un (au plus toutes les 6 h).
    if (!quizDemande) {
      quizDemande = true;
      const demanderQuiz = () => (S.charteOk ? socket.emit('quiz:demander', (quiz) => quiz && ouvrirQuiz(quiz)) : setTimeout(demanderQuiz, 1000));
      setTimeout(demanderQuiz, 1500);
    }
  });
  socket.on('disconnect', (raison) => {
    if (raison === 'io server disconnect') return sessionTerminee();
    majSauvegarde('horsLigne');
  });
  socket.on('connect_error', (e) => {
    if (e.message === 'non-connecte') sessionTerminee();
    else majSauvegarde('horsLigne');
  });
  socket.on('session:terminee', sessionTerminee);

  socket.on('etat:maj', (donnees) => {
    const avant = JSON.stringify(S.etat.onglets);
    appliquerEtat(donnees);
    rendreTout();
    if (JSON.stringify(S.etat.onglets) !== avant) actualiser({ sauvegarder: false });
    else verifierMission();
  });
  socket.on('mission:validee', ({ missionId }) => {
    const mission = S.catalogue.missions.find((m) => m.id === missionId);
    if (mission) notifier({ icone: '✅', titre: 'Validée par ton mentor', texte: `La mission « ${mission.titre} » est validée !`, type: 'succes' });
  });
  socket.on('badges:nouveaux', (nouveaux) => {
    for (const b of nouveaux) if (!S.badges.some((x) => x.badge === b.id)) S.badges.push({ badge: b.id, obtenu_le: Date.now() });
    rendreTout();
    annoncerBadges(nouveaux);
  });
  socket.on('quiz:lancer', (quiz) => ouvrirQuiz(quiz, { parMentor: true }));
  // Le mentor montre une ligne : on ouvre le bon onglet et on la surligne.
  socket.on('pointer', ({ onglet, ligne } = {}) => {
    if (!LANGAGES.includes(onglet) || !S.etat.onglets.includes(onglet) || !Number.isInteger(ligne)) return;
    choisirOnglet(onglet);
    editeurs[onglet].montrerLigne(ligne);
    notifier({ icone: '👉', texte: `Ton mentor te montre la ligne ${ligne} de ton ${onglet.toUpperCase()}.`, duree: 5000 });
  });
  // Le mentor a restauré une ancienne version du site.
  socket.on('code:remplacer', ({ code } = {}) => {
    if (!code) return;
    for (const l of LANGAGES) if (typeof code[l] === 'string') editeurs[l].remplacer(code[l]);
    notifier({ icone: '🕓', titre: 'Ancienne version restaurée', texte: 'Ton mentor a remis une version précédente de ton site. (Ctrl+Z pour annuler)', duree: 10000 });
  });
  socket.on('message', (m) => {
    S.messages.push(m);
    afficherMessage(m);
    majPastille();
  });
}

demarrer();
