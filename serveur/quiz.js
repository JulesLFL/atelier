// Quiz d'échauffement : questions tirées parmi les missions déjà réussies.
// Les bonnes réponses restent sur le serveur ; le navigateur ne reçoit que les questions,
// puis la correction une fois qu'il a répondu.
import crypto from 'node:crypto';

export const NB_QUESTIONS = 3;
const DUREE_VALIDITE_MS = 2 * 3600 * 1000;

function melanger(liste) {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/** Toutes les questions possibles pour un élève (missions réussies). */
export function questionsDisponibles(quiz, reussies) {
  return Object.entries(quiz)
    .filter(([mission]) => reussies.has(mission))
    .flatMap(([mission, questions]) => questions.map((q, i) => ({ ...q, mission, ref: `${mission}#${i}` })));
}

export function creerGestionQuiz() {
  const enCours = new Map(); // eleveId -> { id, questions, expire }

  return {
    /** Crée un quiz. Renvoie null s'il n'y a pas assez de questions. Les choix sont mélangés. */
    generer(eleveId, quiz, reussies) {
      const dispo = questionsDisponibles(quiz, reussies);
      if (dispo.length < NB_QUESTIONS) return null;
      const questions = melanger(dispo)
        .slice(0, NB_QUESTIONS)
        .map((q) => {
          const ordre = melanger(q.choix.map((_, i) => i));
          return { ref: q.ref, mission: q.mission, question: q.question, choix: ordre.map((i) => q.choix[i]), bonne: ordre.indexOf(q.reponse), explication: q.explication || '' };
        });
      const id = crypto.randomUUID();
      enCours.set(eleveId, { id, questions, expire: Date.now() + DUREE_VALIDITE_MS });
      return { id, questions: questions.map(({ question, choix, mission }) => ({ question, choix, mission })) };
    },

    /** Corrige. Renvoie null si le quiz n'existe pas (ou plus). Un quiz ne se corrige qu'une fois. */
    corriger(eleveId, quizId, reponses) {
      const q = enCours.get(eleveId);
      if (!q || q.id !== quizId || q.expire < Date.now()) return null;
      if (!Array.isArray(reponses) || reponses.length !== q.questions.length) return null;
      enCours.delete(eleveId);
      const corrections = q.questions.map((question, i) => ({
        question: question.question,
        reponseDonnee: Number.isInteger(reponses[i]) ? reponses[i] : null,
        bonne: question.bonne,
        juste: reponses[i] === question.bonne,
        explication: question.explication,
        ref: question.ref,
      }));
      return { score: corrections.filter((c) => c.juste).length, total: corrections.length, corrections };
    },
  };
}
