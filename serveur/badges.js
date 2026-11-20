// Badges : calculés par le serveur à partir de la progression (l'élève ne peut pas se les attribuer),
// sauf deux badges « d'exploration » signalés par le navigateur (sans enjeu).

/** Liste affichée à l'élève (ordre d'affichage). */
export const BADGES = [
  { id: 'premier-pas', emoji: '🎯', titre: 'Premier pas', description: 'Réussir ta première mission.' },
  { id: 'batisseur', emoji: '🧱', titre: 'Bâtisseur', description: 'Finir toutes les missions HTML.' },
  { id: 'artiste', emoji: '🎨', titre: 'Artiste', description: 'Finir toutes les missions CSS.' },
  { id: 'magicien', emoji: '⚡', titre: 'Magicien', description: 'Finir toutes les missions JavaScript.' },
  { id: 'sans-filet', emoji: '🧠', titre: 'Sans filet', description: 'Finir un module entier sans aucun indice.' },
  { id: 'defi', emoji: '⭐', titre: 'Relève le défi', description: 'Réussir un défi bonus.' },
  { id: 'legende', emoji: '🌟', titre: 'Légende', description: 'Réussir tous les défis bonus.' },
  { id: 'en-ligne', emoji: '🌍', titre: 'En ligne !', description: 'Avoir son site publié.' },
  { id: 'celebre', emoji: '👀', titre: 'Célèbre', description: '10 visites sur ton site.' },
  { id: 'star', emoji: '🌠', titre: 'Star du web', description: '50 visites sur ton site.' },
  { id: 'assidu', emoji: '🔁', titre: 'Assidu', description: 'Venir coder 3 fois.' },
  { id: 'habitue', emoji: '📅', titre: 'Habitué', description: 'Venir coder 10 fois.' },
  { id: 'tete-bien-faite', emoji: '🧩', titre: 'Tête bien faite', description: 'Faire un sans-faute au quiz.' },
  { id: 'chasseur-de-bugs', emoji: '🐛', titre: 'Chasseur de bugs', description: 'Corriger une erreur JavaScript.' },
  { id: 'explorateur', emoji: '🧪', titre: 'Explorateur', description: 'Passer en mode Bac à sable.' },
];

/** Badges que le navigateur a le droit de signaler lui-même. */
export const BADGES_SIGNALES = new Set(['chasseur-de-bugs', 'explorateur']);

const MODULE_BADGE = { html: 'batisseur', css: 'artiste', js: 'magicien' };

/**
 * @param {object} c
 * @param {{ missions: {id, module, bonus}[] }} c.catalogue
 * @param {Set<string>} c.reussies
 * @param {Record<string, {indices?: number}>} c.progression
 * @param {boolean} c.publie
 * @param {number} c.visites
 * @param {number} c.seances
 * @param {boolean} c.quizParfait
 * @returns {string[]} identifiants des badges mérités
 */
export function badgesMerites(c) {
  const merites = [];
  if (c.reussies.size > 0) merites.push('premier-pas');
  let sansFilet = false;
  for (const [module, badge] of Object.entries(MODULE_BADGE)) {
    const obligatoires = c.catalogue.missions.filter((m) => m.module === module && !m.bonus);
    if (obligatoires.length && obligatoires.every((m) => c.reussies.has(m.id))) {
      merites.push(badge);
      if (obligatoires.every((m) => !c.progression[m.id]?.indices)) sansFilet = true;
    }
  }
  if (sansFilet) merites.push('sans-filet');
  const bonus = c.catalogue.missions.filter((m) => m.bonus);
  const bonusFaits = bonus.filter((m) => c.reussies.has(m.id)).length;
  if (bonusFaits >= 1) merites.push('defi');
  if (bonus.length && bonusFaits === bonus.length) merites.push('legende');
  if (c.publie) merites.push('en-ligne');
  if (c.visites >= 10) merites.push('celebre');
  if (c.visites >= 50) merites.push('star');
  if (c.seances >= 3) merites.push('assidu');
  if (c.seances >= 10) merites.push('habitue');
  if (c.quizParfait) merites.push('tete-bien-faite');
  return merites;
}
