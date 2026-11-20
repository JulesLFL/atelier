// ============================================================================
//  JOURNAL DE L'ATELIER : les nouveautés, affichées sur la page /journal.
//  À chaque mise à jour du site, ajoute une entrée EN HAUT de la liste.
//
//  { version: '1.5', date: '2026-12-03', titre: '…', resume: '…',
//    changements: [ { type: 'nouveau' | 'amelioration' | 'correction' | 'securite', texte: '…' } ] }
//
//  Écris pour les élèves et leurs parents : simple, concret, sans jargon.
// ============================================================================

export const journal = [
  {
    version: '1.4',
    date: '2026-11-20',
    titre: 'Plus de missions, un nouveau look',
    resume: 'Neuf nouvelles missions pour aller plus loin, et un site qui a désormais sa propre identité.',
    changements: [
      { type: 'nouveau', texte: 'Neuf nouvelles missions : un formulaire de contact, des images légendées, des titres bien rangés, les variables CSS, ton site sur téléphone, les animations, afficher et cacher, les conditions et les boucles.' },
      { type: 'nouveau', texte: 'Le programme complet est consultable sur la page « Programme ».' },
      { type: 'nouveau', texte: 'Un diplôme à imprimer quand tu as terminé toutes les missions.' },
      { type: 'nouveau', texte: 'Cette page « Journal », et une page « À propos ».' },
      { type: 'amelioration', texte: 'Nouveau design : des couleurs tirées du code (orange HTML, bleu CSS, jaune JS), un thème clair et un thème sombre, de nouvelles polices plus lisibles et un vrai logo.' },
      { type: 'amelioration', texte: 'Une charte à lire à la première connexion, et une page d’information pour les parents.' },
      { type: 'amelioration', texte: 'Un lien pour signaler un site de la vitrine.' },
      { type: 'securite', texte: 'Vérification automatique de l’accessibilité (clavier, lecteur d’écran, contrastes) à chaque modification.' },
    ],
  },
  {
    version: '1.3',
    date: '2026-11-20',
    titre: 'Une page d’accueil, et ton accord avant toute publication',
    resume: 'Le site a maintenant une vraie page d’accueil, une vitrine et ses pages légales.',
    changements: [
      { type: 'nouveau', texte: 'Page d’accueil, page de connexion séparée et vitrine redessinée.' },
      { type: 'nouveau', texte: 'Mentions légales, politique de confidentialité et conditions d’utilisation.' },
      { type: 'securite', texte: 'Rien n’est publié sans ton accord : tu demandes la publication depuis « Mon site », et tu peux retirer ton site toi-même à tout moment.' },
    ],
  },
  {
    version: '1.2',
    date: '2026-11-20',
    titre: 'La grosse mise à jour',
    resume: 'Défis, badges, quiz, et plein d’outils pour t’aider à coder.',
    changements: [
      { type: 'nouveau', texte: 'Six défis bonus ⭐ pour aller plus loin, quinze badges à débloquer et un quiz d’échauffement.' },
      { type: 'nouveau', texte: 'Les erreurs HTML sont expliquées en français et soulignées dans l’éditeur.' },
      { type: 'nouveau', texte: 'Aperçu de ton site comme sur un téléphone.' },
      { type: 'nouveau', texte: '« Mon site » : un QR code, le nombre de visites et le téléchargement de tes fichiers.' },
      { type: 'nouveau', texte: 'Ton mentor peut te montrer une ligne de ton code, et remettre une ancienne version si tout a été effacé par erreur.' },
      { type: 'securite', texte: 'Sauvegardes quotidiennes chiffrées.' },
    ],
  },
  {
    version: '1.1',
    date: '2026-11-20',
    titre: 'Corrections',
    resume: 'Les missions se valident maintenant dans tous les navigateurs.',
    changements: [{ type: 'correction', texte: 'Dans Chrome, Edge et Safari, la checklist d’une mission ne se cochait pas. C’est réparé.' }],
  },
  {
    version: '1.0',
    date: '2026-11-20',
    titre: 'Ouverture de l’Atelier',
    resume: 'Première version : apprendre le HTML, le CSS et le JavaScript en construisant son propre site.',
    changements: [
      { type: 'nouveau', texte: '19 missions guidées, avec explications, exemples, indices et checklist automatique.' },
      { type: 'nouveau', texte: 'L’aperçu de ta page en direct, et les erreurs JavaScript expliquées en français.' },
      { type: 'nouveau', texte: 'Le mode Bac à sable et son mémo.' },
      { type: 'nouveau', texte: 'La publication de ton site à sa propre adresse.' },
    ],
  },
];
