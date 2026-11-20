// Panneau mentor : élèves, direct, déblocages, messages, progression, publication.
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '../styles/base.css';
import '../styles/eleve.css';
import '../styles/entree.css';
import '../styles/entree.css';
import '../styles/mentor.css';
import { io } from 'socket.io-client';
import { api } from '../commun/api.js';
import { h, vider, debounce, copier, dateRelative, duree, prefs } from '../commun/dom.js';
import { creerEditeur } from '../commun/editeur.js';
import { creerApercu } from '../commun/apercu.js';
import { creerConsole } from '../commun/console.js';
import { notifier, confirmer, fenetre } from '../commun/notifications.js';
import { verifierHtml } from '@partage/verif-html.js';
import { compterProgression } from '@partage/regles.js';
import { ongletHistorique, ongletNotes, ouvrirSysteme, verifierSysteme } from './extras.js';

const app = document.getElementById('app');
const LANGAGES = ['html', 'css', 'js'];
const FICHIERS = { html: 'index.html', css: 'style.css', js: 'script.js' };
const ONGLETS = [
  { id: 'direct', titre: '🔴 Direct' },
  { id: 'parcours', titre: '🗺️ Parcours' },
  { id: 'messages', titre: '💬 Messages' },
  { id: 'progression', titre: '📈 Progression' },
  { id: 'historique', titre: '🕓 Historique' },
  { id: 'notes', titre: '📝 Notes' },
  { id: 'publication', titre: '🌍 Publication' },
  { id: 'acces', titre: '🔑 Accès' },
];

const M = {
  catalogue: null,
  eleves: [],
  selection: prefs.lire('mentor:selection', null),
  fiche: null,
  onglet: prefs.lire('mentor:onglet', 'direct'),
  ongletCode: 'html',
};
let socket;
let direct = null; // { editeurs, apercu, console }

// =============================================================================
//  Connexion
// =============================================================================
async function demarrer() {
  try {
    await api('GET', '/api/mentor/session');
  } catch (e) {
    if (e.statut === 401) return ecranConnexion();
    return vider(app, h('p', { class: 'bandeau-erreur' }, e.message));
  }
  M.catalogue = await api('GET', '/api/mentor/missions');
  await chargerEleves();
  connecterTempsReel();
  rendreSquelette();
  if (M.selection && M.eleves.some((e) => e.id === M.selection)) selectionner(M.selection);
  else rendreFiche();
}

function ecranConnexion() {
  document.body.classList.add('page-entree');
  const champ = h('input', { type: 'password', id: 'mdp', autocomplete: 'current-password', required: true });
  const erreur = h('p', { class: 'erreur', role: 'alert' });
  const formulaire = h(
    'form',
    {
      onsubmit: async (e) => {
        e.preventDefault();
        erreur.textContent = '';
        try {
          await api('POST', '/api/mentor/connexion', { motDePasse: champ.value });
          location.reload();
        } catch (err) {
          erreur.textContent = err.message;
          champ.select();
        }
      },
    },
    h('label', { for: 'mdp' }, 'Mot de passe mentor'),
    champ,
    erreur,
    h('button', { class: 'bouton-principal', type: 'submit' }, 'Entrer →'),
  );
  vider(app, h('main', { class: 'carte-entree carte-mentor' }, h('div', { class: 'logo-grand', 'aria-hidden': 'true' }, '</>'), h('h1', {}, 'Espace mentor'), h('p', { class: 'sous-titre' }, 'L’Atelier, côté coulisses 🎬'), formulaire));
  champ.focus();
}

// =============================================================================
//  Structure de la page
// =============================================================================
function rendreSquelette() {
  vider(
    app,
    h(
      'header',
      { class: 'barre' },
      h('div', { class: 'marque' }, h('span', { class: 'logo', 'aria-hidden': 'true' }, '</>'), 'L’Atelier ', h('span', { class: 'puce-mentor' }, 'mentor')),
      h('div', { class: 'barre-droite' }, h('span', { id: 'alerte-systeme' }), h('button', { class: 'bouton-discret', onclick: () => ouvrirSysteme() }, '⚙️ Système'), h('button', { class: 'bouton-discret', onclick: deconnecter }, 'Se déconnecter')),
    ),
    h(
      'div',
      { class: 'mentor' },
      h('aside', { class: 'liste-eleves', 'aria-label': 'Élèves' }, h('div', { class: 'entete-liste' }, h('h2', {}, 'Élèves'), h('button', { class: 'bouton-principal petit', onclick: nouvelEleve }, '+ Nouveau')), h('ul', { id: 'eleves' })),
      h('main', { class: 'fiche', id: 'fiche' }),
    ),
  );
  rendreListe();
  verifierSysteme(document.getElementById('alerte-systeme'));
}

async function deconnecter() {
  await api('POST', '/api/mentor/deconnexion');
  location.reload();
}

async function chargerEleves() {
  M.eleves = await api('GET', '/api/mentor/eleves');
}

function rendreListe() {
  const ul = document.getElementById('eleves');
  if (!ul) return;
  vider(
    ul,
    M.eleves.length
      ? M.eleves.map((e) =>
          h(
            'li',
            {},
            h(
              'button',
              { class: `eleve${e.id === M.selection ? ' actif' : ''}`, onclick: () => selectionner(e.id), 'aria-current': e.id === M.selection ? 'true' : null },
              h('span', { class: `presence${e.enLigne ? ' en-ligne' : ''}`, title: e.enLigne ? 'En ligne' : 'Hors ligne' }),
              h('span', { class: 'nom' }, e.pseudo),
              h('span', { class: 'mini-progression' }, `${e.reussies}/${e.total}`),
              e.publie_le && h('span', { title: 'Site publié' }, '🌍'),
            ),
          ),
        )
      : h('li', { class: 'vide' }, 'Aucun élève pour l’instant.'),
  );
}

async function selectionner(id) {
  M.selection = id;
  prefs.ecrire('mentor:selection', id);
  rendreListe();
  const reponse = await new Promise((ok) => socket.emit('suivre', id, ok));
  if (!reponse?.ok) {
    M.fiche = null;
    return rendreFiche();
  }
  M.fiche = reponse.fiche;
  rendreFiche();
}

// =============================================================================
//  Fiche d'un élève
// =============================================================================
function rendreFiche() {
  const fiche = document.getElementById('fiche');
  detruireDirect();
  if (!M.fiche) {
    vider(fiche, h('div', { class: 'fiche-vide' }, h('div', { class: 'grand-emoji' }, '👈'), h('p', {}, M.eleves.length ? 'Choisis un élève.' : 'Commence par créer un élève avec « + Nouveau ».')));
    return;
  }
  const f = M.fiche;
  vider(
    fiche,
    h(
      'div',
      { class: 'entete-fiche' },
      h('h1', {}, f.eleve.pseudo),
      h('span', { class: `etat-presence${f.enLigne ? ' en-ligne' : ''}` }, f.enLigne ? '🟢 En ligne' : `⚪ Vu ${dateRelative(f.eleve.derniereActivite)}`),
      h('span', { class: 'resume' }, resumeFiche(f)),
    ),
    h(
      'nav',
      { class: 'onglets-fiche', role: 'tablist' },
      ONGLETS.map((o) => h('button', { role: 'tab', 'aria-selected': String(o.id === M.onglet), onclick: () => changerOnglet(o.id) }, o.titre)),
    ),
    h('div', { class: 'contenu-fiche', id: 'contenu-fiche' }),
  );
  rendreOnglet();
}

function resumeFiche(f) {
  const { faites, total, bonusFaits } = compterProgression(f.etat);
  return `${faites} / ${total} missions${bonusFaits ? ` · ⭐ ${bonusFaits} défi${bonusFaits > 1 ? 's' : ''}` : ''} · 🏅 ${f.badges?.length || 0} · ${duree(f.eleve.tempsActifS)} de code`;
}

function changerOnglet(id) {
  M.onglet = id;
  prefs.ecrire('mentor:onglet', id);
  rendreFiche();
}

function rendreOnglet() {
  const c = document.getElementById('contenu-fiche');
  const contexte = { M, rechargerFiche };
  ({
    direct: ongletDirect,
    parcours: ongletParcours,
    messages: ongletMessages,
    progression: ongletProgression,
    historique: (el) => ongletHistorique(el, contexte),
    notes: (el) => ongletNotes(el, contexte),
    publication: ongletPublication,
    acces: ongletAcces,
  })[M.onglet](c);
}

/** Met à jour la fiche sans casser la vue en direct (éditeurs). */
function rafraichirFiche() {
  if (M.onglet === 'direct' && direct) {
    majInfosDirect();
    const entete = document.querySelector('.entete-fiche');
    if (entete) {
      const f = M.fiche;
      entete.querySelector('.etat-presence').className = `etat-presence${f.enLigne ? ' en-ligne' : ''}`;
      entete.querySelector('.etat-presence').textContent = f.enLigne ? '🟢 En ligne' : `⚪ Vu ${dateRelative(f.eleve.derniereActivite)}`;
      entete.querySelector('.resume').textContent = resumeFiche(f);
    }
  } else {
    rendreFiche();
  }
}

// -----------------------------------------------------------------------------
//  Direct
// -----------------------------------------------------------------------------
function ongletDirect(c) {
  const f = M.fiche;
  const zoneEditeurs = h('div', { class: 'editeurs' });
  const cadre = h('div', { class: 'cadre-apercu' });
  const blocConsole = h(
    'div',
    { class: 'console' },
    h('div', { class: 'entete-console' }, h('button', { class: 'bascule-console', 'aria-expanded': 'true' }, h('span', { class: 'chevron', 'aria-hidden': 'true' }, '▾'), '🖥️ Console de l’élève', h('span', { class: 'compteur-erreurs', hidden: true })), h('button', { class: 'bouton-discret petit vider-console' }, 'Effacer')),
    h('div', { class: 'lignes-console' }),
  );
  const ongletsCode = h('div', { class: 'onglets-code', role: 'tablist' });

  vider(
    c,
    h('div', { class: 'infos-direct', id: 'infos-direct' }),
    h(
      'div',
      { class: 'grille-direct' },
      h('section', { class: 'zone-editeur' }, h('div', { class: 'entete-zone' }, ongletsCode, h('span', { class: 'lecture-seule', title: 'Clique sur un numéro de ligne pour la surligner chez l’élève' }, '👆 clic sur un n° de ligne = la montrer')), zoneEditeurs),
      h('section', { class: 'zone-apercu' }, h('div', { class: 'entete-zone' }, h('div', { class: 'titre-zone' }, h('span', { class: 'point-direct' }), 'Ce que voit l’élève')), cadre, blocConsole),
    ),
    envoiRapide(),
  );

  const editeurs = {};
  for (const l of LANGAGES) {
    const zone = h('div', { class: 'editeur', hidden: l !== M.ongletCode });
    zoneEditeurs.append(zone);
    editeurs[l] = creerEditeur(zone, l, {
      doc: f.code?.[l] ?? '',
      lectureSeule: true,
      // Clic sur un numéro de ligne : elle est surlignée chez l'élève.
      surClicLigne: (ligne) => {
        socket.emit('pointer', { eleveId: M.selection, onglet: l, ligne });
        editeurs[l].montrerLigne(ligne, 2500);
        notifier({ icone: '👉', texte: `Ligne ${ligne} montrée à l’élève.`, duree: 2000 });
      },
    });
  }
  const console_ = creerConsole(blocConsole, { cleOuverture: 'mentor:console' });
  const apercu = creerApercu(cadre, { surMessage: (msg, infos) => console_.recevoir(msg, infos), surRechargement: () => console_.effacer() });
  direct = { editeurs, apercu, console: console_, code: f.code, resultats: null, ongletsCode };
  rendreOngletsCodeMentor();
  majApercuDirect();
  majInfosDirect();
}

function rendreOngletsCodeMentor() {
  if (!direct) return;
  vider(
    direct.ongletsCode,
    LANGAGES.map((l) =>
      h(
        'button',
        {
          role: 'tab',
          class: `onglet-code langage-${l}`,
          'aria-selected': String(l === M.ongletCode),
          onclick: () => {
            M.ongletCode = l;
            for (const x of LANGAGES) direct.editeurs[x].vue.dom.parentElement.hidden = x !== l;
            direct.editeurs[l].mesurer();
            rendreOngletsCodeMentor();
          },
        },
        h('span', { class: 'pastille-langage' }),
        FICHIERS[l],
        !M.fiche.etat.onglets.includes(l) && h('span', { class: 'cadenas', title: 'Pas encore débloqué pour l’élève' }, '🔒'),
      ),
    ),
  );
}

const majApercuDirect = debounce(async () => {
  if (!direct) return;
  const onglets = M.fiche.etat.onglets;
  direct.apercu.mettreAJour(direct.code, onglets);
  const remarques = verifierHtml(direct.code?.html);
  direct.console.remarquesHtml(remarques);
  direct.editeurs.html.remarques(remarques);
  const mission = M.catalogue.missions.find((m) => m.id === M.fiche.missionCourante);
  if (mission) {
    const r = await direct.apercu.verifier(direct.code, onglets, mission.verifications);
    if (r && direct) {
      direct.resultats = r;
      majInfosDirect();
    }
  }
}, 300);

function majInfosDirect() {
  const zone = document.getElementById('infos-direct');
  if (!zone || !M.fiche) return;
  const f = M.fiche;
  const mission = M.catalogue.missions.find((m) => m.id === f.missionCourante);
  const module = mission && M.catalogue.modules.find((m) => m.id === mission.module);
  const indices = mission ? f.progression[mission.id]?.indices || 0 : 0;
  const statut = mission && f.etat.missions.find((m) => m.id === mission.id)?.statut;
  const r = direct?.resultats;
  vider(
    zone,
    h('div', { class: 'info' }, h('span', { class: 'etiquette' }, 'Mission en cours'), mission ? h('strong', {}, `${module.emoji} ${mission.titre}`) : h('strong', {}, '—'), statut === 'reussie' && h('span', { class: 'puce-reussie' }, ' ✓ réussie')),
    h('div', { class: 'info' }, h('span', { class: 'etiquette' }, 'Indices utilisés'), h('strong', {}, mission ? `💡 ${indices} / ${(mission.indices || []).length}` : '—')),
    h(
      'div',
      { class: 'info info-checklist' },
      h('span', { class: 'etiquette' }, 'Checklist'),
      mission && r
        ? h(
            'ul',
            {},
            mission.verifications.map((v, i) => h('li', { class: r[i] ? 'ok' : '' }, r[i] ? '✓ ' : '○ ', v.label)),
          )
        : h('strong', {}, '—'),
    ),
  );
}

function detruireDirect() {
  if (!direct) return;
  for (const e of Object.values(direct.editeurs)) e.detruire();
  direct = null;
}

function envoiRapide() {
  const champ = h('input', { type: 'text', class: 'champ', placeholder: 'Message rapide ou indice pour l’élève…', maxlength: 1000, 'aria-label': 'Message pour l’élève' });
  const envoyer = async (type) => {
    if (!champ.value.trim()) return champ.focus();
    try {
      await api('POST', `/api/mentor/eleves/${M.selection}/messages`, { type, texte: champ.value });
      notifier({ icone: type === 'indice' ? '💡' : '💬', texte: 'Envoyé !', duree: 2000, type: 'succes' });
      champ.value = '';
    } catch (e) {
      notifier({ icone: '⚠️', texte: e.message, type: 'erreur' });
    }
  };
  champ.addEventListener('keydown', (e) => e.key === 'Enter' && envoyer('message'));
  const quiz = async () => {
    try {
      await api('POST', `/api/mentor/eleves/${M.selection}/quiz`);
      notifier({ icone: '🧩', texte: 'Quiz envoyé : il s’affiche chez l’élève.', duree: 3000, type: 'succes' });
    } catch (e) {
      notifier({ icone: '⚠️', texte: e.message, type: 'erreur' });
    }
  };
  return h(
    'div',
    { class: 'envoi-rapide' },
    champ,
    h('button', { class: 'bouton-secondaire', onclick: () => envoyer('indice') }, '💡 Indice'),
    h('button', { class: 'bouton-principal', onclick: () => envoyer('message') }, '💬 Envoyer'),
    h('button', { class: 'bouton-secondaire', onclick: quiz, title: '3 questions sur ce qu’il a déjà appris' }, '🧩 Quiz'),
  );
}

// -----------------------------------------------------------------------------
//  Parcours et déblocages
// -----------------------------------------------------------------------------
async function deblocage(cible, etat) {
  try {
    M.fiche = { ...(await api('PUT', `/api/mentor/eleves/${M.selection}/deblocages`, { cible, etat })), enLigne: M.fiche.enLigne };
    rendreFiche();
  } catch (e) {
    notifier({ icone: '⚠️', texte: e.message, type: 'erreur' });
  }
}

async function validation(missionId, valider) {
  try {
    M.fiche = { ...(await api(valider ? 'POST' : 'DELETE', `/api/mentor/eleves/${M.selection}/missions/${missionId}/validation`)), enLigne: M.fiche.enLigne };
    rendreFiche();
    chargerEleves().then(rendreListe);
  } catch (e) {
    notifier({ icone: '⚠️', texte: e.message, type: 'erreur' });
  }
}

function ongletParcours(c) {
  const f = M.fiche;
  const statuts = Object.fromEntries(f.etat.missions.map((m) => [m.id, m]));
  vider(
    c,
    h('p', { class: 'aide-onglet' }, 'Ouvre un module quand l’élève est prêt : ses missions se débloquent ensuite une par une. Tu peux aussi forcer l’ouverture ou la fermeture d’une mission précise.'),
    M.catalogue.modules.map((module) => {
      const ouvert = f.etat.modules.find((m) => m.id === module.id)?.ouvert;
      const force = f.deblocages[`module:${module.id}`];
      return h(
        'section',
        { class: `carte-module module-${module.id}` },
        h(
          'header',
          {},
          h('h2', {}, `${module.emoji} ${module.titre}`, h('small', {}, ` · ${module.sousTitre}`)),
          h(
            'label',
            { class: 'interrupteur' },
            h('input', { type: 'checkbox', role: 'switch', checked: ouvert, onchange: (e) => deblocage(`module:${module.id}`, e.target.checked ? 'ouvert' : 'ferme') }),
            h('span', { class: 'glissiere', 'aria-hidden': 'true' }),
            ouvert ? 'Module ouvert' : 'Module fermé',
          ),
          force && h('button', { class: 'bouton-discret petit', onclick: () => deblocage(`module:${module.id}`, null), title: 'Revenir au réglage par défaut (seul le HTML est ouvert au départ)' }, 'défaut'),
        ),
        h(
          'table',
          { class: 'table-missions' },
          h('thead', {}, h('tr', {}, h('th', {}, '#'), h('th', {}, 'Mission'), h('th', {}, 'État'), h('th', {}, 'Indices'), h('th', {}, 'Accès'), h('th', {}, ''))),
          h(
            'tbody',
            {},
            M.catalogue.missions
              .filter((m) => m.module === module.id)
              .map((m, i) => {
                const st = statuts[m.id];
                const p = f.progression[m.id];
                const select = h(
                  'select',
                  { 'aria-label': `Accès à ${m.titre}`, onchange: (e) => deblocage(`mission:${m.id}`, e.target.value || null) },
                  h('option', { value: '', selected: !st.force }, 'Auto'),
                  h('option', { value: 'ouvert', selected: st.force === 'ouvert' }, 'Forcer ouvert'),
                  h('option', { value: 'ferme', selected: st.force === 'ferme' }, 'Forcer fermé'),
                );
                return h(
                  'tr',
                  { class: m.id === f.missionCourante ? 'courante' : '' },
                  h('td', {}, i + 1),
                  h('td', {}, m.bonus ? `⭐ ${m.titre}` : m.titre, m.bonus && h('small', { class: 'mini-bonus' }, ' défi bonus'), m.id === f.missionCourante && h('span', { class: 'puce-courante' }, 'en cours')),
                  h('td', {}, h('span', { class: `statut statut-${st.statut}` }, { reussie: '✅ réussie', disponible: '▶️ disponible', verrouillee: '🔒 verrouillée' }[st.statut]), p?.parMentor && h('small', { title: 'Validée par toi' }, ' (par toi)')),
                  h('td', {}, p?.indices ? `💡 ${p.indices}` : '—'),
                  h('td', {}, select),
                  h('td', {}, st.statut === 'reussie' ? h('button', { class: 'bouton-discret petit', onclick: () => validation(m.id, false) }, 'Annuler') : h('button', { class: 'bouton-discret petit', onclick: () => validation(m.id, true), title: 'Valider la mission à la place de l’élève' }, 'Valider')),
                );
              }),
          ),
        ),
      );
    }),
  );
}

// -----------------------------------------------------------------------------
//  Messages
// -----------------------------------------------------------------------------
function ongletMessages(c) {
  const f = M.fiche;
  const zone = h('textarea', { class: 'champ', rows: 3, maxlength: 1000, placeholder: 'Ton message (il s’affiche en notification chez l’élève)', 'aria-label': 'Message' });
  const type = h('select', { class: 'champ', 'aria-label': 'Type' }, h('option', { value: 'message' }, '💬 Message'), h('option', { value: 'indice' }, '💡 Indice (reste affiché jusqu’à ce qu’il le ferme)'));
  const envoyer = async () => {
    try {
      const m = await api('POST', `/api/mentor/eleves/${M.selection}/messages`, { type: type.value, texte: zone.value });
      M.fiche.messages.unshift(m);
      rendreFiche();
    } catch (e) {
      notifier({ icone: '⚠️', texte: e.message, type: 'erreur' });
    }
  };
  vider(
    c,
    h('div', { class: 'formulaire-message' }, zone, h('div', { class: 'ligne' }, type, h('button', { class: 'bouton-principal', onclick: envoyer }, 'Envoyer'))),
    h('h2', { class: 'titre-section' }, 'Historique'),
    f.messages.length
      ? h(
          'ul',
          { class: 'liste-messages' },
          f.messages.map((m) => h('li', { class: `message-${m.type}` }, h('span', {}, m.type === 'indice' ? '💡' : '💬'), h('p', {}, m.texte), h('time', { title: new Date(m.envoye_le).toLocaleString('fr-FR') }, `${dateRelative(m.envoye_le)} · ${m.lu_le ? 'lu ✓' : 'non lu'}`))),
        )
      : h('p', { class: 'aide-onglet' }, 'Aucun message envoyé.'),
  );
}

// -----------------------------------------------------------------------------
//  Progression
// -----------------------------------------------------------------------------
function ongletProgression(c) {
  const f = M.fiche;
  const { faites, total, bonusFaits, bonusTotal } = compterProgression(f.etat);
  const indices = Object.values(f.progression).reduce((s, p) => s + (p.indices || 0), 0);
  const obtenus = new Map((f.badges || []).map((b) => [b.badge, b.obtenu_le]));
  const parModule = M.catalogue.modules.map((mod) => {
    const ids = M.catalogue.missions.filter((m) => m.module === mod.id && !m.bonus).map((m) => m.id);
    const ok = ids.filter((id) => f.etat.missions.find((m) => m.id === id)?.statut === 'reussie').length;
    return { mod, ok, total: ids.length };
  });
  const derniere = f.seances[0];
  vider(
    c,
    h(
      'div',
      { class: 'cartes-stats' },
      h('div', { class: 'stat' }, h('span', { class: 'valeur' }, `${faites}/${total}`), h('span', {}, 'missions réussies')),
      h('div', { class: 'stat' }, h('span', { class: 'valeur' }, `⭐ ${bonusFaits}/${bonusTotal}`), h('span', {}, 'défis bonus')),
      h('div', { class: 'stat' }, h('span', { class: 'valeur' }, `👀 ${f.visites || 0}`), h('span', {}, 'visites du site')),
      h('div', { class: 'stat' }, h('span', { class: 'valeur' }, duree(f.eleve.tempsActifS)), h('span', {}, 'de code actif')),
      h('div', { class: 'stat' }, h('span', { class: 'valeur' }, derniere ? new Date(derniere.debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'), h('span', {}, 'dernière séance')),
      h('div', { class: 'stat' }, h('span', { class: 'valeur' }, indices), h('span', {}, 'indices utilisés')),
    ),
    h(
      'div',
      { class: 'barres-modules' },
      parModule.map(({ mod, ok, total }) => h('div', { class: `barre-module module-${mod.id}` }, h('span', {}, `${mod.emoji} ${mod.titre}`), h('div', { class: 'jauge' }, h('div', { class: 'jauge-remplie', style: `width:${(ok / total) * 100}%` })), h('span', {}, `${ok}/${total}`))),
    ),
    h('h2', { class: 'titre-section' }, `Badges (${obtenus.size} / ${M.catalogue.badges.length})`),
    h(
      'ul',
      { class: 'badges-mentor' },
      M.catalogue.badges.map((b) =>
        h('li', { class: obtenus.has(b.id) ? 'obtenu' : '', title: `${b.description}${obtenus.has(b.id) ? ` · obtenu le ${new Date(obtenus.get(b.id)).toLocaleDateString('fr-FR')}` : ''}` }, h('span', { 'aria-hidden': 'true' }, obtenus.has(b.id) ? b.emoji : '·'), b.titre),
      ),
    ),
    h('h2', { class: 'titre-section' }, 'Quiz d’échauffement'),
    f.quiz?.length
      ? h(
          'ul',
          { class: 'chronologie' },
          f.quiz.map((q) =>
            h('li', {}, h('time', {}, new Date(q.fait_le).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })), ` ${q.score}/${q.total} `, q.score === q.total ? '🏆' : '', h('small', { class: 'details-quiz' }, ` (${q.details.filter((d) => !d.juste).map((d) => d.ref.split('#')[0]).join(', ') || 'sans faute'})`)),
          ),
        )
      : h('p', { class: 'aide-onglet' }, 'Pas encore de quiz. Il est proposé automatiquement en début de séance (au plus toutes les 6 h) dès 3 missions réussies, ou lance-le avec « 🧩 Quiz » dans l’onglet Direct.'),
    h('h2', { class: 'titre-section' }, 'Séances'),
    f.seances.length
      ? h(
          'table',
          { class: 'table-missions' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Date'), h('th', {}, 'Horaires'), h('th', {}, 'Temps actif'))),
          h(
            'tbody',
            {},
            f.seances.map((s) => {
              const heure = (t) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
              return h('tr', {}, h('td', {}, new Date(s.debut).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })), h('td', {}, `${heure(s.debut)} → ${heure(s.fin)}`), h('td', {}, duree(s.actif_s)));
            }),
          ),
        )
      : h('p', { class: 'aide-onglet' }, 'Pas encore de séance.'),
    h('h2', { class: 'titre-section' }, 'Missions réussies'),
    h(
      'ul',
      { class: 'chronologie' },
      Object.entries(f.progression)
        .filter(([, p]) => p.reussieLe)
        .sort((a, b) => b[1].reussieLe - a[1].reussieLe)
        .map(([id, p]) => h('li', {}, h('time', {}, new Date(p.reussieLe).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })), ' ', M.catalogue.missions.find((m) => m.id === id)?.titre || id, p.parMentor ? ' (validée par toi)' : '', p.indices ? ` · 💡 ${p.indices}` : '')),
    ),
  );
}

// -----------------------------------------------------------------------------
//  Publication
// -----------------------------------------------------------------------------
function ongletPublication(c) {
  const f = M.fiche;
  const pub = f.publication;
  const publier = async () => {
    try {
      await api('POST', `/api/mentor/eleves/${M.selection}/publication`);
      notifier({ icone: '🌍', texte: 'Site publié !', type: 'succes', duree: 3000 });
      await rechargerFiche();
    } catch (e) {
      notifier({ icone: '⚠️', texte: e.message, type: 'erreur' });
    }
  };
  const depublier = async () => {
    if (!(await confirmer({ titre: 'Dépublier le site ?', texte: 'Le lien ne marchera plus jusqu’à la prochaine publication.', ok: 'Dépublier', danger: true }))) return;
    await api('DELETE', `/api/mentor/eleves/${M.selection}/publication`);
    await rechargerFiche();
  };
  vider(
    c,
    h(
      'div',
      { class: 'carte-publication' },
      pub
        ? [
            h('p', { class: 'statut-pub en-ligne' }, '🟢 Site en ligne'),
            lienCopiable(pub.url),
            h('p', { class: 'aide-onglet' }, `Copie publiée ${dateRelative(pub.publieLe)}. C’est une copie figée : les modifications de l’élève n’apparaissent qu’après « Mettre à jour ».`),
            h('div', { class: 'ligne' }, h('a', { class: 'bouton-secondaire', href: pub.url, target: '_blank', rel: 'noopener' }, 'Voir le site ↗'), h('button', { class: 'bouton-principal', onclick: publier }, '🔄 Mettre à jour'), h('button', { class: 'bouton-danger', onclick: depublier }, 'Dépublier')),
            h('p', { class: 'statut-visites' }, `👀 ${f.visites || 0} visite${(f.visites || 0) > 1 ? 's' : ''} (anonymes, sans doublon dans la journée, robots exclus)`),
            h(
              'label',
              { class: 'interrupteur interrupteur-vitrine' },
              h('input', {
                type: 'checkbox',
                role: 'switch',
                checked: f.vitrine,
                onchange: async (e) => {
                  try {
                    await api('PUT', `/api/mentor/eleves/${M.selection}/vitrine`, { visible: e.target.checked });
                    M.fiche.vitrine = e.target.checked;
                    notifier({ icone: '🖼️', texte: e.target.checked ? 'Site ajouté à la vitrine.' : 'Site retiré de la vitrine.', duree: 2500, type: 'succes' });
                  } catch (err) {
                    e.target.checked = !e.target.checked;
                    notifier({ icone: '⚠️', texte: err.message, type: 'erreur' });
                  }
                },
              }),
              h('span', { class: 'glissiere', 'aria-hidden': 'true' }),
              'Afficher dans la ',
              h('a', { href: '/vitrine', target: '_blank', rel: 'noopener' }, 'vitrine publique'),
            ),
          ]
        : [
            h('p', { class: 'statut-pub' }, '⚪ Pas encore publié'),
            h('p', { class: 'aide-onglet' }, `Publier crée une copie du site de l’élève à l’adresse ${f.urlSite}. Seuls les modules débloqués (${f.etat.onglets.map((o) => o.toUpperCase()).join(', ')}) sont inclus.`),
            h('button', { class: 'bouton-principal', onclick: publier }, '🌍 Publier le site'),
          ],
    ),
    h('section', { class: 'carte-publication' }, h('h2', {}, '⬇️ Fichiers du site'), h('p', { class: 'aide-onglet' }, 'Le code actuel de l’élève (pas forcément la version publiée), en .zip : index.html, style.css, script.js.'), h('a', { class: 'bouton-secondaire', href: `/api/mentor/eleves/${M.selection}/site.zip` }, 'Télécharger le .zip')),
  );
}

function lienCopiable(lien) {
  const bouton = h('button', { class: 'bouton-secondaire' }, '📋 Copier');
  bouton.addEventListener('click', async () => {
    bouton.textContent = (await copier(lien)) ? '✓ Copié' : 'Oups';
    setTimeout(() => (bouton.textContent = '📋 Copier'), 1500);
  });
  return h('div', { class: 'lien-copiable' }, h('code', {}, lien), bouton);
}

// -----------------------------------------------------------------------------
//  Accès (lien personnel) et suppression
// -----------------------------------------------------------------------------
function afficherAcces(pseudo, { code, lien }) {
  fenetre(
    `Accès de ${pseudo}`,
    h('p', {}, 'Envoie ce lien à l’élève : il l’ouvre et arrive directement dans son atelier.'),
    lienCopiable(lien),
    h('p', {}, 'Ou il tape ce code sur la page d’entrée :'),
    h('p', { class: 'code-acces' }, code),
    h('p', { class: 'avertissement' }, '⚠️ Ce lien n’est affiché qu’une seule fois (il est stocké chiffré). Si tu le perds, génères-en un nouveau.'),
  );
}

function ongletAcces(c) {
  const f = M.fiche;
  const regenerer = async () => {
    if (!(await confirmer({ titre: 'Nouveau lien d’accès ?', texte: 'L’ancien lien et l’ancien code ne marcheront plus, et l’élève sera déconnecté.', ok: 'Générer' }))) return;
    afficherAcces(f.eleve.pseudo, await api('POST', `/api/mentor/eleves/${M.selection}/code`));
  };
  const supprimer = async () => {
    if (!(await confirmer({ titre: `Supprimer ${f.eleve.pseudo} ?`, texte: 'Son site, sa progression et ses messages seront effacés définitivement. Impossible de revenir en arrière.', ok: 'Supprimer définitivement', danger: true }))) return;
    await api('DELETE', `/api/mentor/eleves/${M.selection}`);
    M.selection = null;
    M.fiche = null;
    await chargerEleves();
    rendreListe();
    rendreFiche();
  };
  vider(
    c,
    h('section', { class: 'carte-publication' }, h('h2', {}, '🔑 Lien d’accès'), h('p', { class: 'aide-onglet' }, 'Le lien est stocké chiffré : on ne peut pas le réafficher. Génère un nouveau lien si l’élève a perdu le sien.'), h('button', { class: 'bouton-principal', onclick: regenerer }, 'Générer un nouveau lien')),
    h('section', { class: 'carte-publication zone-danger' }, h('h2', {}, '🗑️ Supprimer l’élève'), h('p', { class: 'aide-onglet' }, 'Efface toutes ses données (pseudo, code, progression, messages, site publié).'), h('button', { class: 'bouton-danger', onclick: supprimer }, 'Supprimer')),
  );
}

async function nouvelEleve() {
  const champ = h('input', { class: 'champ', id: 'nouveau-pseudo', placeholder: 'ex. alex', maxlength: 20, autocomplete: 'off', spellcheck: 'false' });
  const erreur = h('p', { class: 'erreur', role: 'alert' });
  const fermer = fenetre(
    'Nouvel élève',
    h('p', {}, 'Juste un pseudo (pas de nom de famille !). Il servira aussi pour l’adresse du site publié : /site/pseudo'),
    h(
      'form',
      {
        class: 'formulaire-pseudo',
        onsubmit: async (e) => {
          e.preventDefault();
          try {
            const r = await api('POST', '/api/mentor/eleves', { pseudo: champ.value });
            fermer();
            await chargerEleves();
            await selectionner(r.id);
            afficherAcces(r.pseudo, r);
          } catch (err) {
            erreur.textContent = err.message;
          }
        },
      },
      h('label', { for: 'nouveau-pseudo' }, 'Pseudo'),
      champ,
      erreur,
      h('button', { class: 'bouton-principal', type: 'submit' }, 'Créer'),
    ),
  );
  champ.focus();
}

async function rechargerFiche() {
  const enLigne = M.fiche?.enLigne;
  M.fiche = { ...(await api('GET', `/api/mentor/eleves/${M.selection}`)), enLigne: M.fiche ? enLigne : false };
  rendreFiche();
  chargerEleves().then(rendreListe);
}

// =============================================================================
//  Temps réel
// =============================================================================
function connecterTempsReel() {
  socket = io('/mentor', { transports: ['websocket', 'polling'] });
  socket.on('connect_error', (e) => {
    if (e.message === 'non-connecte') location.reload();
  });
  socket.on('connect', () => {
    // Après une reconnexion, on se réabonne à l'élève suivi.
    if (M.selection && M.fiche) socket.emit('suivre', M.selection, (r) => r?.ok && ((M.fiche = r.fiche), rafraichirFiche()));
  });
  socket.on('eleve:code', (code) => {
    if (!M.fiche) return;
    M.fiche.code = code;
    if (!direct) return;
    direct.code = code;
    for (const l of LANGAGES) direct.editeurs[l].remplacer(code[l], { historique: false });
    majApercuDirect();
  });
  socket.on('eleve:etat', (fiche) => {
    if (!M.fiche || fiche.eleve.id !== M.selection) return;
    const ancienneMission = M.fiche.missionCourante;
    const anciensOnglets = M.fiche.etat.onglets.join();
    M.fiche = { ...fiche, enLigne: M.fiche.enLigne };
    rafraichirFiche();
    if (direct && (ancienneMission !== fiche.missionCourante || anciensOnglets !== fiche.etat.onglets.join())) {
      rendreOngletsCodeMentor();
      majApercuDirect();
    }
    const e = M.eleves.find((x) => x.id === fiche.eleve.id);
    if (e) {
      e.reussies = fiche.etat.missions.filter((m) => m.statut === 'reussie').length;
      rendreListe();
    }
  });
  socket.on('eleve:quiz', ({ score, total }) => {
    notifier({ icone: '🧩', titre: 'Quiz terminé', texte: `${M.fiche?.eleve.pseudo || 'L’élève'} : ${score}/${total}`, type: score === total ? 'succes' : 'info', duree: 8000 });
  });
  socket.on('eleve:presence', ({ id, enLigne }) => {
    const e = M.eleves.find((x) => x.id === id);
    if (e) e.enLigne = enLigne;
    rendreListe();
    if (M.fiche && M.selection === id) {
      M.fiche.enLigne = enLigne;
      if (!enLigne) M.fiche.eleve.derniereActivite = Date.now();
      rafraichirFiche();
    }
  });
}

demarrer();
