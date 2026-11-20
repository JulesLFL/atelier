// Panneau de gauche : la mission en cours, le parcours et le mémo.
import { h, vider, markdown, copier } from '../commun/dom.js';
import { notifier } from '../commun/notifications.js';

const NOMS_ONGLETS = { html: 'HTML', css: 'CSS', js: 'JS' };
const CATEGORIES = [
  { id: 'lexique', titre: '📖 Lexique' },
  { id: 'balise', titre: '🧱 Balises HTML' },
  { id: 'propriete', titre: '🎨 CSS' },
  { id: 'js', titre: '⚡ JavaScript' },
];
const ONGLET_CATEGORIE = { balise: 'html', propriete: 'css', js: 'js' };

/** Bloc de code avec boutons « Copier » et « Insérer ». */
function blocCode(code, onglet, { inserer, ongletOuvert }) {
  const boutonCopier = h('button', { class: 'bouton-mini', type: 'button' }, '📋 Copier');
  boutonCopier.addEventListener('click', async () => {
    const ok = await copier(code);
    boutonCopier.textContent = ok ? '✓ Copié !' : 'Oups';
    setTimeout(() => (boutonCopier.textContent = '📋 Copier'), 1500);
  });
  const peutInserer = onglet && ongletOuvert(onglet);
  return h(
    'div',
    { class: 'bloc-code' },
    h('div', { class: 'bloc-code-entete' }, h('span', { class: `etiquette-langage langage-${onglet}` }, NOMS_ONGLETS[onglet] || ''), h('span', { class: 'espace' }), boutonCopier, peutInserer && h('button', { class: 'bouton-mini', type: 'button', onclick: () => inserer(onglet, code), title: `Insérer dans ton ${NOMS_ONGLETS[onglet]} à l’endroit du curseur` }, '↳ Insérer')),
    h('pre', {}, h('code', {}, code)),
  );
}

// ---------------------------------------------------------------------------
//  Mission en cours
// ---------------------------------------------------------------------------
export function rendreMission(conteneur, S, actions) {
  const mission = S.catalogue.missions.find((m) => m.id === S.missionCourante);
  if (!mission) {
    const toutFini = S.etat.missions.every((m) => m.statut === 'reussie');
    vider(
      conteneur,
      h(
        'div',
        { class: 'mission-vide' },
        h('div', { class: 'grand-emoji', 'aria-hidden': 'true' }, toutFini ? '🏆' : '⏳'),
        h('h2', {}, toutFini ? 'Tu as fini toutes les missions !' : 'Pas de mission pour l’instant'),
        h('p', {}, toutFini ? 'Respect. Ton site est à toi : continue-le en Bac à sable.' : 'Ton mentor va bientôt débloquer la suite. En attendant, amuse-toi en Bac à sable 🧪'),
        h('button', { class: 'bouton-principal', onclick: () => actions.changerMode('libre') }, '🧪 Aller au Bac à sable'),
      ),
    );
    return;
  }

  const duModule = S.catalogue.missions.filter((m) => m.module === mission.module);
  const module = S.catalogue.modules.find((m) => m.id === mission.module);
  const statut = S.etat.missions.find((m) => m.id === mission.id)?.statut;
  const indicesVus = S.progression[mission.id]?.indices || 0;
  const exemples = typeof mission.exemple === 'string' ? { [mission.module]: mission.exemple } : mission.exemple || {};

  const listeIndices = h('div', { class: 'indices' });
  const rendreIndices = (n) => {
    vider(listeIndices);
    (mission.indices || []).slice(0, n).forEach((texte, i) => listeIndices.append(h('div', { class: 'indice' }, h('span', { class: 'indice-numero' }, `💡 Indice ${i + 1}`), h('div', {}, markdown(texte)))));
    const reste = (mission.indices || []).length - n;
    if (reste > 0) {
      listeIndices.append(
        h(
          'button',
          {
            class: 'bouton-indice',
            onclick: () => {
              actions.indiceRevele(mission.id, n + 1);
              rendreIndices(n + 1);
            },
          },
          n === 0 ? '💡 Besoin d’un coup de main ?' : '💡 Encore un indice',
        ),
      );
    }
  };
  rendreIndices(indicesVus);

  vider(
    conteneur,
    h(
      'article',
      { class: 'mission', 'data-mission': mission.id },
      h(
        'div',
        { class: 'mission-meta' },
        h('span', { class: `puce-module module-${mission.module}` }, `${module.emoji} ${module.titre}`),
        h('span', { class: 'numero-mission' }, `Mission ${duModule.indexOf(mission) + 1} / ${duModule.length}`),
        statut === 'reussie' && h('span', { class: 'puce-reussie' }, '✓ Réussie'),
      ),
      h('h2', { class: 'titre-mission' }, mission.titre),
      h('div', { class: 'objectif' }, h('span', { 'aria-hidden': 'true' }, '🎯'), h('p', {}, mission.objectif)),
      h('div', { class: 'explication' }, markdown(mission.explication)),
      Object.keys(exemples).length > 0 &&
        h('section', { class: 'exemple' }, h('h3', {}, 'Exemple'), Object.entries(exemples).map(([onglet, code]) => blocCode(code, onglet, actions))),
      h(
        'section',
        { class: 'checklist' },
        h('h3', {}, 'Ta checklist'),
        h(
          'ul',
          { id: 'checklist' },
          mission.verifications.map((v) => h('li', { class: 'a-verifier' }, h('span', { class: 'case', 'aria-hidden': 'true' }), h('span', { class: 'label' }, v.label))),
        ),
      ),
      statut !== 'reussie' && listeIndices,
      statut === 'reussie' && actions.suivante(mission.id) && h('button', { class: 'bouton-principal bouton-suivante', onclick: () => actions.choisirMission(actions.suivante(mission.id)) }, 'Mission suivante →'),
    ),
  );
  if (S.resultats) majChecklist(S.resultats);
}

export function majChecklist(resultats) {
  const items = document.querySelectorAll('#checklist li');
  items.forEach((li, i) => {
    const ok = resultats?.[i] === true;
    li.classList.remove('a-verifier');
    if (ok && !li.classList.contains('ok')) li.classList.add('vient-detre-coche');
    li.classList.toggle('ok', ok);
    li.setAttribute('aria-label', `${ok ? 'Fait' : 'Pas encore'} : ${li.querySelector('.label').textContent}`);
  });
}

// ---------------------------------------------------------------------------
//  Parcours
// ---------------------------------------------------------------------------
export function rendreParcours(conteneur, S, actions) {
  const statuts = Object.fromEntries(S.etat.missions.map((m) => [m.id, m.statut]));
  vider(
    conteneur,
    h('p', { class: 'intro-panneau' }, 'Toutes tes missions. Tu peux revenir sur une mission déjà réussie quand tu veux.'),
    S.catalogue.modules.map((module) => {
      const missions = S.catalogue.missions.filter((m) => m.module === module.id);
      const faites = missions.filter((m) => statuts[m.id] === 'reussie').length;
      const ouvert = S.etat.modules.find((m) => m.id === module.id)?.ouvert;
      return h(
        'section',
        { class: `parcours-module module-${module.id}${ouvert ? '' : ' ferme'}` },
        h('h3', {}, h('span', {}, `${module.emoji} ${module.titre}`), h('span', { class: 'compte' }, ouvert ? `${faites} / ${missions.length}` : '🔒 bientôt')),
        h(
          'ol',
          {},
          missions.map((m, i) => {
            const st = statuts[m.id];
            const icone = st === 'reussie' ? '✅' : st === 'disponible' ? '▶️' : '🔒';
            return h(
              'li',
              {},
              h(
                'button',
                {
                  class: `etape etape-${st}${m.id === S.missionCourante ? ' courante' : ''}`,
                  disabled: st === 'verrouillee',
                  'aria-current': m.id === S.missionCourante ? 'step' : null,
                  onclick: () => actions.choisirMission(m.id),
                },
                h('span', { class: 'etape-icone', 'aria-hidden': 'true' }, icone),
                h('span', { class: 'etape-numero' }, `${i + 1}.`),
                h('span', { class: 'etape-titre' }, m.titre),
              ),
            );
          }),
        ),
      );
    }),
  );
}

// ---------------------------------------------------------------------------
//  Mémo : uniquement ce qui est débloqué
// ---------------------------------------------------------------------------
export function entreesMemo(S) {
  const accessibles = new Set(S.etat.missions.filter((m) => m.statut !== 'verrouillee').map((m) => m.id));
  const entrees = [];
  for (const module of S.catalogue.modules) {
    const missions = S.catalogue.missions.filter((m) => m.module === module.id && accessibles.has(m.id));
    for (const m of missions) for (const e of m.memo || []) entrees.push({ ...e, onglet: ONGLET_CATEGORIE[e.categorie] || module.id });
    if (S.etat.onglets.includes(module.id)) for (const e of module.memo || []) entrees.push({ ...e, onglet: ONGLET_CATEGORIE[e.categorie] || module.id, bonus: true });
  }
  return entrees;
}

export function rendreMemo(conteneur, S, actions) {
  const entrees = entreesMemo(S);
  const recherche = h('input', { type: 'search', class: 'recherche-memo', placeholder: '🔍 Chercher (ex. couleur, lien, clic…)', 'aria-label': 'Chercher dans le mémo' });
  const liste = h('div', { class: 'liste-memo' });

  const normaliser = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function afficher() {
    const q = normaliser(recherche.value.trim());
    const filtrees = q ? entrees.filter((e) => normaliser(`${e.terme} ${e.definition} ${e.exemple || ''}`).includes(q)) : entrees;
    vider(liste);
    if (!filtrees.length) {
      liste.append(h('p', { class: 'vide' }, entrees.length ? 'Rien trouvé. Essaie un autre mot !' : 'Ton mémo se remplira au fil des missions.'));
      return;
    }
    for (const cat of CATEGORIES) {
      const duType = filtrees.filter((e) => e.categorie === cat.id || (!e.categorie && cat.id === 'lexique'));
      if (!duType.length) continue;
      liste.append(
        h(
          'section',
          { class: 'memo-categorie' },
          h('h3', {}, cat.titre),
          duType.map((e) =>
            h(
              'details',
              { class: 'entree-memo', open: q ? true : null },
              h('summary', {}, h('span', { class: cat.id === 'lexique' ? 'terme' : 'terme terme-code' }, e.terme), e.bonus && h('span', { class: 'puce-bonus' }, 'bonus')),
              h('p', {}, e.definition),
              e.exemple && blocCode(e.exemple, e.onglet, actions),
            ),
          ),
        ),
      );
    }
  }
  recherche.addEventListener('input', afficher);
  vider(
    conteneur,
    S.mode === 'libre' && h('div', { class: 'bandeau-libre' }, h('strong', {}, '🧪 Bac à sable'), h('p', {}, 'Ici, pas de mission : construis ce que tu veux sur ton site ! Pioche des idées dans le mémo.')),
    recherche,
    liste,
  );
  afficher();
}

export function annoncerDeblocage(module) {
  notifier({ icone: module.emoji, titre: `${module.titre} débloqué !`, texte: `Un nouvel onglet ${NOMS_ONGLETS[module.id]} est apparu dans l’éditeur. ${module.sousTitre} 🔓`, type: 'succes', duree: 10000 });
}
