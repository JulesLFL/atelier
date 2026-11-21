// Logique métier commune aux routes HTTP et au temps réel.
import { calculerEtat, missionAccessible, missionParDefaut } from '../partage/regles.js';
import { BADGES, BADGES_SIGNALES, badgesMerites } from './badges.js';
import { creerGestionQuiz } from './quiz.js';

const QUIZ_INTERVALLE_MS = 6 * 3600 * 1000; // au plus un quiz proposé automatiquement toutes les 6 h

export function creerService({ bdd, catalogue, config, discord }) {
  const gestionQuiz = creerGestionQuiz();
  const alerte = (texte) => discord?.envoyer(texte);
  // Code en cours de frappe, gardé en mémoire puis écrit en base par paquets.
  const enAttente = new Map(); // eleveId -> { code, minuterie }
  const DELAI_ECRITURE_MS = 1500;

  function etatDeblocage(eleveId) {
    return calculerEtat(catalogue, bdd.deblocages(eleveId), bdd.missionsReussies(eleveId));
  }

  function urlSite(pseudo) {
    return `${config.urlPublique}/site/${pseudo}`;
  }

  function codeActuel(eleveId) {
    const e = enAttente.get(eleveId);
    if (e) return { ...e.code };
    const p = bdd.projet(eleveId);
    return p ? { html: p.html, css: p.css, js: p.js } : null;
  }

  function ecrireMaintenant(eleveId) {
    const e = enAttente.get(eleveId);
    if (!e) return;
    clearTimeout(e.minuterie);
    enAttente.delete(eleveId);
    bdd.majProjet(eleveId, e.code);
  }

  function enregistrerCode(eleveId, code) {
    const e = enAttente.get(eleveId) || {};
    clearTimeout(e.minuterie);
    enAttente.set(eleveId, { code, minuterie: setTimeout(() => ecrireMaintenant(eleveId), DELAI_ECRITURE_MS) });
  }

  function toutEcrire() {
    for (const id of [...enAttente.keys()]) ecrireMaintenant(id);
  }

  /** Mission courante valide (accessible) ; corrige la valeur stockée si besoin. */
  function missionCourante(eleve, etat) {
    if (eleve.mission_courante && missionAccessible(etat, eleve.mission_courante)) return eleve.mission_courante;
    const parDefaut = missionParDefaut(etat);
    if (parDefaut !== eleve.mission_courante) bdd.definirMissionCourante(eleve.id, parDefaut);
    if (parDefaut) bdd.prendreInstantane(eleve.id, parDefaut);
    return parDefaut;
  }

  function progressionParMission(eleveId) {
    return Object.fromEntries(
      bdd.progression(eleveId).map((p) => [
        p.mission_id,
        { reussieLe: p.reussie_le, indices: p.indices_utilises, parMentor: Boolean(p.validee_par_mentor) },
      ]),
    );
  }

  /** Tout ce dont l'écran de l'élève a besoin. */
  function etatEleve(eleveId) {
    const eleve = bdd.eleveParId(eleveId);
    if (!eleve) return null;
    const etat = etatDeblocage(eleveId);
    const pub = bdd.publication(eleveId);
    return {
      eleve: { id: eleve.id, pseudo: eleve.pseudo },
      etat,
      missionCourante: missionCourante(eleve, etat),
      progression: progressionParMission(eleveId),
      publication: pub ? { url: urlSite(eleve.pseudo), publieLe: pub.publie_le } : null,
      visites: eleve.visites,
      badges: bdd.succes(eleveId),
      accords: { publication: eleve.accord_publication, vitrine: eleve.accord_vitrine },
      charteAcceptee: eleve.charte_acceptee,
      vitrine: Boolean(eleve.vitrine),
    };
  }

  /** Vue complète pour le panneau mentor. */
  function ficheMentor(eleveId) {
    const base = etatEleve(eleveId);
    if (!base) return null;
    const eleve = bdd.eleveParId(eleveId);
    return {
      ...base,
      eleve: {
        id: eleve.id,
        pseudo: eleve.pseudo,
        creeLe: eleve.cree_le,
        derniereActivite: eleve.derniere_activite,
        tempsActifS: eleve.temps_actif_s,
      },
      deblocages: bdd.deblocages(eleveId),
      code: codeActuel(eleveId),
      seances: bdd.seances(eleveId),
      messages: bdd.messages(eleveId),
      urlSite: urlSite(eleve.pseudo),
      quiz: bdd.quiz(eleveId, 10),
      parentsInformes: eleve.parents_informes,
      mineur: Boolean(eleve.mineur),
    };
  }

  function choisirMission(eleveId, missionId) {
    const etat = etatDeblocage(eleveId);
    if (!missionAccessible(etat, missionId)) return false;
    ecrireMaintenant(eleveId); // l'instantané doit partir du code le plus récent
    bdd.definirMissionCourante(eleveId, missionId);
    bdd.prendreInstantane(eleveId, missionId);
    return true;
  }

  function reussirMission(eleveId, missionId, parMentor = false) {
    const etat = etatDeblocage(eleveId);
    if (!parMentor && !missionAccessible(etat, missionId)) return false;
    const dejaFaites = bdd.missionsReussies(eleveId);
    bdd.reussirMission(eleveId, missionId, parMentor);
    // Alerte Discord quand un module (ses missions obligatoires) vient d'être terminé.
    const mission = catalogue.missions.find((m) => m.id === missionId);
    if (mission && !dejaFaites.has(missionId)) {
      const faites = bdd.missionsReussies(eleveId);
      const obligatoires = catalogue.missions.filter((m) => m.module === mission.module && !m.bonus);
      const module = catalogue.modules.find((m) => m.id === mission.module);
      if (!mission.bonus && obligatoires.every((m) => faites.has(m.id))) {
        alerte(`🏁 **${bdd.eleveParId(eleveId).pseudo}** a terminé le module ${module.emoji} ${module.titre} !`);
      }
    }
    return true;
  }

  // --- Badges ------------------------------------------------------------------
  /** Attribue les badges mérités. Renvoie ceux qui viennent d'être gagnés (pour la notification). */
  function attribuerBadges(eleveId) {
    const eleve = bdd.eleveParId(eleveId);
    if (!eleve) return [];
    const merites = badgesMerites({
      catalogue,
      reussies: bdd.missionsReussies(eleveId),
      progression: progressionParMission(eleveId),
      publie: Boolean(bdd.publication(eleveId)),
      visites: eleve.visites,
      seances: bdd.nombreSeances(eleveId),
      quizParfait: bdd.quiz(eleveId, 50).some((q) => q.score === q.total),
    });
    return merites.filter((id) => bdd.ajouterSucces(eleveId, id)).map((id) => BADGES.find((b) => b.id === id));
  }

  /** Badge signalé par le navigateur (seulement ceux de la liste autorisée). */
  function badgeSignale(eleveId, badge) {
    if (!BADGES_SIGNALES.has(badge)) return [];
    return bdd.ajouterSucces(eleveId, badge) ? [BADGES.find((b) => b.id === badge)] : [];
  }

  // --- Quiz ----------------------------------------------------------------------
  /** Propose un quiz (au plus toutes les 6 h, sauf si le mentor le lance : force). */
  function proposerQuiz(eleveId, { force = false } = {}) {
    const eleve = bdd.eleveParId(eleveId);
    if (!eleve) return null;
    if (!force && eleve.quiz_propose_le && Date.now() - eleve.quiz_propose_le < QUIZ_INTERVALLE_MS) return null;
    const quiz = gestionQuiz.generer(eleveId, catalogue.quiz, bdd.missionsReussies(eleveId));
    if (quiz) bdd.noterQuizPropose(eleveId);
    return quiz;
  }

  function repondreQuiz(eleveId, quizId, reponses) {
    const resultat = gestionQuiz.corriger(eleveId, quizId, reponses);
    if (!resultat) return null;
    bdd.ajouterQuiz(eleveId, resultat.score, resultat.total, resultat.corrections.map(({ ref, juste }) => ({ ref, juste })));
    alerte(`🧩 **${bdd.eleveParId(eleveId).pseudo}** a fait le quiz d’échauffement : ${resultat.score}/${resultat.total}.`);
    return resultat;
  }

  /** Au début de chaque séance (plus de 30 min sans version), on garde une copie du site. */
  function versionDeSeance(eleveId) {
    const derniere = bdd.versions(eleveId)[0];
    if (derniere && Date.now() - derniere.cree_le < 30 * 60 * 1000) return null;
    ecrireMaintenant(eleveId);
    return bdd.ajouterVersion(eleveId, 'seance');
  }

  /** Remet une ancienne version : la mémoire tampon est vidée d'abord pour ne rien perdre. */
  function restaurerVersion(eleveId, versionId) {
    ecrireMaintenant(eleveId);
    return bdd.restaurerVersion(eleveId, versionId);
  }

  // --- Accord de l'élève pour la publication ---------------------------------------
  /** L'élève demande la publication (et dit s'il accepte la vitrine). */
  function demanderPublication(eleveId, { vitrine = false } = {}) {
    const eleve = bdd.eleveParId(eleveId);
    const maintenant = Date.now();
    bdd.definirAccords(eleveId, { publication: eleve.accord_publication || maintenant, vitrine: vitrine ? eleve.accord_vitrine || maintenant : null });
    if (!vitrine) bdd.definirVitrine(eleveId, false);
    if (!eleve.accord_publication) alerte(`📣 **${eleve.pseudo}** demande la publication de son site${vitrine ? ' (et accepte la vitrine)' : ''}.`);
  }

  /** L'élève accepte ou refuse la vitrine. Refuser retire aussitôt son site de la vitrine. */
  function accordVitrine(eleveId, accepte) {
    const eleve = bdd.eleveParId(eleveId);
    if (accepte && !eleve.accord_publication) return false;
    bdd.definirAccords(eleveId, { publication: eleve.accord_publication, vitrine: accepte ? eleve.accord_vitrine || Date.now() : null });
    if (!accepte) bdd.definirVitrine(eleveId, false);
    return true;
  }

  /** L'élève retire son accord : son site est dépublié et sorti de la vitrine immédiatement. */
  function retirerPublication(eleveId) {
    const eleve = bdd.eleveParId(eleveId);
    bdd.definirAccords(eleveId, { publication: null, vitrine: null });
    bdd.definirVitrine(eleveId, false);
    const etaitPublie = bdd.depublier(eleveId);
    if (etaitPublie || eleve.accord_publication) alerte(`🚫 **${eleve.pseudo}** a retiré son site${etaitPublie ? ' (il a été dépublié)' : ''}.`);
  }

  return {
    demanderPublication,
    accordVitrine,
    retirerPublication,
    attribuerBadges,
    badgeSignale,
    proposerQuiz,
    repondreQuiz,
    versionDeSeance,
    restaurerVersion,
    etatDeblocage,
    etatEleve,
    ficheMentor,
    codeActuel,
    enregistrerCode,
    ecrireMaintenant,
    toutEcrire,
    choisirMission,
    reussirMission,
    urlSite,
  };
}
