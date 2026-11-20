// Vérification de tout ce qui arrive au serveur. On ne fait jamais confiance au navigateur.

export const TAILLE_MAX_FICHIER = 200 * 1024; // 200 Ko par onglet, largement assez pour un site d'élève
export const TAILLE_MAX_MESSAGE = 1000;
const PSEUDO = /^[a-z0-9](?:[a-z0-9-]{0,18}[a-z0-9])?$/;
const PSEUDOS_RESERVES = new Set(['admin', 'mentor', 'api', 'site', 'atelier', 'entree', 'e']);

export function validerPseudo(pseudo) {
  const p = String(pseudo ?? '').trim().toLowerCase();
  if (p.length < 2 || !PSEUDO.test(p)) {
    return { erreur: 'Pseudo : 2 à 20 caractères, lettres minuscules, chiffres et tirets (pas au début ni à la fin).' };
  }
  if (PSEUDOS_RESERVES.has(p)) return { erreur: 'Ce pseudo est réservé.' };
  return { valeur: p };
}

export function validerCode(code) {
  if (!code || typeof code !== 'object') return { erreur: 'Code manquant.' };
  const resultat = {};
  for (const cle of ['html', 'css', 'js']) {
    const v = code[cle];
    if (typeof v !== 'string') return { erreur: `Le champ « ${cle} » doit être du texte.` };
    if (Buffer.byteLength(v, 'utf8') > TAILLE_MAX_FICHIER) return { erreur: `Ton ${cle.toUpperCase()} est trop long (200 Ko max).` };
    resultat[cle] = v;
  }
  return { valeur: resultat };
}

export function validerMessage(type, texte) {
  if (!['message', 'indice'].includes(type)) return { erreur: 'Type de message inconnu.' };
  const t = String(texte ?? '').trim();
  if (!t) return { erreur: 'Message vide.' };
  if (t.length > TAILLE_MAX_MESSAGE) return { erreur: `Message trop long (${TAILLE_MAX_MESSAGE} caractères max).` };
  return { valeur: { type, texte: t } };
}

export function validerCible(catalogue, cible) {
  const [type, id] = String(cible ?? '').split(':');
  if (type === 'module' && catalogue.modules.some((m) => m.id === id)) return true;
  if (type === 'mission' && catalogue.missions.some((m) => m.id === id)) return true;
  return false;
}

export const missionExiste = (catalogue, id) => typeof id === 'string' && catalogue.missions.some((m) => m.id === id);
