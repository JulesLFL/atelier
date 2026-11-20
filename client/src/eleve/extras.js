// Badges, quiz d'échauffement et fenêtre « Mon site » (QR code, visites, téléchargement).
import qrcode from 'qrcode-generator';
import { h, vider, copier } from '../commun/dom.js';
import { notifier, fenetre } from '../commun/notifications.js';
import { confettis } from './celebration.js';

// --------------------------------------------------------------------------
//  Badges
// --------------------------------------------------------------------------
export function annoncerBadges(nouveaux) {
  for (const b of nouveaux || []) {
    confettis(70);
    notifier({ icone: b.emoji, titre: 'Nouveau badge !', texte: `${b.titre} : ${b.description}`, type: 'succes', duree: 9000 });
  }
}

/** @param {object[]} definitions  liste envoyée par le serveur (serveur/badges.js) */
export function ouvrirBadges(definitions, obtenus) {
  const dates = new Map(obtenus.map((b) => [b.badge, b.obtenu_le]));
  fenetre(
    `🏅 Tes badges (${dates.size} / ${definitions.length})`,
    h(
      'ul',
      { class: 'grille-badges' },
      definitions.map((b) => {
        const obtenu = dates.has(b.id);
        return h(
          'li',
          { class: `badge${obtenu ? ' obtenu' : ''}`, title: obtenu ? `Obtenu le ${new Date(dates.get(b.id)).toLocaleDateString('fr-FR')}` : 'Pas encore obtenu' },
          h('span', { class: 'badge-emoji', 'aria-hidden': 'true' }, obtenu ? b.emoji : '🔒'),
          h('strong', {}, b.titre),
          h('small', {}, b.description),
        );
      }),
    ),
  );
}

// --------------------------------------------------------------------------
//  Quiz d'échauffement
// --------------------------------------------------------------------------
/**
 * @param {{ id: string, questions: {question: string, choix: string[]}[] }} quiz
 * @param {(reponses: number[]) => Promise<object|null>} envoyer  renvoie la correction du serveur
 * @param {{ parMentor?: boolean }} options
 */
export function lancerQuiz(quiz, envoyer, { parMentor = false } = {}) {
  const reponses = [];
  const corps = h('div', { class: 'quiz' });
  let fermer;

  const intro = () =>
    vider(
      corps,
      h('p', {}, parMentor ? 'Ton mentor te lance un petit défi : ' : 'Avant de coder, un petit échauffement : ', h('strong', {}, `${quiz.questions.length} questions`), ' sur ce que tu as déjà appris. 🧠'),
      h('div', { class: 'modal-actions' }, !parMentor && h('button', { class: 'bouton-secondaire', onclick: () => fermer() }, 'Plus tard'), h('button', { class: 'bouton-principal', onclick: () => question(0) }, 'C’est parti →')),
    );

  const question = (i) => {
    const q = quiz.questions[i];
    vider(
      corps,
      h('p', { class: 'quiz-avancement' }, `Question ${i + 1} / ${quiz.questions.length}`),
      h('h3', { class: 'quiz-question' }, q.question),
      h(
        'div',
        { class: 'quiz-choix', role: 'group', 'aria-label': 'Réponses possibles' },
        q.choix.map((c, j) =>
          h(
            'button',
            {
              class: 'choix',
              onclick: () => {
                reponses[i] = j;
                if (i + 1 < quiz.questions.length) question(i + 1);
                else terminer();
              },
            },
            h('code', {}, String.fromCharCode(65 + j)),
            ` ${c}`,
          ),
        ),
      ),
    );
    corps.querySelector('.choix')?.focus();
  };

  const terminer = async () => {
    vider(corps, h('p', {}, 'Correction…'));
    const resultat = await envoyer(reponses);
    if (!resultat) {
      vider(corps, h('p', {}, 'Oups, ce quiz a expiré. Pas grave !'));
      return;
    }
    if (resultat.score === resultat.total) confettis(160);
    vider(
      corps,
      h('p', { class: 'quiz-score' }, `${resultat.score} / ${resultat.total}`, ' ', resultat.score === resultat.total ? '🏆 Sans-faute !' : resultat.score >= resultat.total - 1 ? '💪 Bien joué !' : '🙂 On revoit ça ensemble !'),
      h(
        'ol',
        { class: 'quiz-corrections' },
        resultat.corrections.map((c, i) =>
          h(
            'li',
            { class: c.juste ? 'juste' : 'faux' },
            h('strong', {}, `${c.juste ? '✅' : '❌'} ${c.question}`),
            !c.juste && h('p', {}, 'Bonne réponse : ', h('code', {}, quiz.questions[i].choix[c.bonne])),
            c.explication && h('p', { class: 'explication-quiz' }, c.explication),
          ),
        ),
      ),
      h('div', { class: 'modal-actions' }, h('button', { class: 'bouton-principal', onclick: () => fermer() }, 'À l’atelier ! →')),
    );
  };

  intro();
  fermer = fenetre('🧩 Échauffement', corps);
  // La fenêtre générique ajoute un bouton « Fermer » : on le cache, le quiz a ses propres boutons.
  corps.closest('.modal')?.querySelector(':scope > .modal-actions')?.remove();
}

// --------------------------------------------------------------------------
//  Mon site : lien, QR code, visites, téléchargement
// --------------------------------------------------------------------------
function dessinerQr(texte) {
  const qr = qrcode(0, 'M');
  qr.addData(texte);
  qr.make();
  const n = qr.getModuleCount();
  const marge = 4;
  const taille = 8;
  const toile = h('canvas', { class: 'qr', width: (n + marge * 2) * taille, height: (n + marge * 2) * taille, role: 'img', 'aria-label': `QR code vers ${texte}` });
  const ctx = toile.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, toile.width, toile.height);
  ctx.fillStyle = '#0b0e14';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) ctx.fillRect((x + marge) * taille, (y + marge) * taille, taille, taille);
  return toile;
}

export function ouvrirMonSite({ publication, visites, pseudo }) {
  const telecharger = h('a', { class: 'bouton-secondaire', href: '/api/eleve/site.zip', download: `site-${pseudo}.zip` }, '⬇️ Télécharger mon site (.zip)');
  if (!publication) {
    fenetre(
      '🌍 Mon site',
      h('p', {}, 'Ton site n’est pas encore publié. Quand il sera prêt, demande à ton mentor de le mettre en ligne : tu auras une adresse à partager et un QR code pour le montrer à tes proches !'),
      h('p', {}, 'En attendant, tu peux déjà récupérer tes fichiers :'),
      telecharger,
    );
    return;
  }
  const boutonCopier = h('button', { class: 'bouton-secondaire' }, '📋 Copier le lien');
  boutonCopier.addEventListener('click', async () => {
    boutonCopier.textContent = (await copier(publication.url)) ? '✓ Copié !' : 'Oups';
    setTimeout(() => (boutonCopier.textContent = '📋 Copier le lien'), 1500);
  });
  fenetre(
    '🌍 Mon site',
    h('div', { class: 'mon-site' }, dessinerQr(publication.url), h('div', {}, h('p', {}, 'Scanne ce QR code avec un téléphone, ou partage le lien :'), h('p', {}, h('a', { href: publication.url, target: '_blank', rel: 'noopener' }, publication.url)), h('p', { class: 'visites' }, `👀 ${visites} visite${visites > 1 ? 's' : ''}`))),
    h('div', { class: 'ligne-boutons' }, boutonCopier, telecharger),
    h('p', { class: 'aide-mon-site' }, 'Le site en ligne est une copie : quand tu l’améliores, demande à ton mentor de le mettre à jour.'),
  );
}
