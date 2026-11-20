// Logique métier commune aux routes HTTP et au temps réel.
import { calculerEtat, missionAccessible, missionParDefaut } from '../partage/regles.js';

export function creerService({ bdd, catalogue, config }) {
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
    bdd.reussirMission(eleveId, missionId, parMentor);
    return true;
  }

  return {
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
