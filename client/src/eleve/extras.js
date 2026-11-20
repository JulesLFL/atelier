// Badges, quiz d'échauffement et fenêtre « Mon site » (QR code, visites, téléchargement).
import qrcode from 'qrcode-generator';
import { h, vider, copier } from '../commun/dom.js';
import { notifier, fenetre, confirmer } from '../commun/notifications.js';
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

/**
 * Fenêtre « Mon site ». Trois cas :
 *  - pas encore d'accord : l'élève peut demander la publication (et accepter ou non la vitrine) ;
 *  - accord donné, pas encore publié : la demande attend le mentor (annulable) ;
 *  - publié : QR code, lien, visites, accord vitrine modifiable, retrait possible à tout moment.
 * @param {{ publication, visites, pseudo, accords: {publication, vitrine}, vitrine: boolean,
 *           demander: (vitrine: boolean) => Promise, retirer: () => Promise, accordVitrine: (oui: boolean) => Promise }} o
 */
export function ouvrirMonSite(o) {
  const { publication, visites, pseudo, accords } = o;
  const telecharger = h('a', { class: 'bouton-secondaire', href: '/api/eleve/site.zip', download: `site-${pseudo}.zip` }, '⬇️ Télécharger mon site (.zip)');
  let fermer;
  const rouvrir = (etat) => {
    fermer?.();
    ouvrirMonSite({ ...o, ...etat });
  };

  const caseVitrine = (coche, surChangement) => {
    const entree = h('input', { type: 'checkbox', checked: coche, onchange: (e) => surChangement(e.target.checked) });
    return h('label', { class: 'case-accord' }, entree, h('span', {}, 'Mon site peut aussi apparaître dans la ', h('a', { href: '/vitrine', target: '_blank', rel: 'noopener' }, 'vitrine'), ' de l’Atelier.'));
  };

  // 1. Pas encore d'accord
  if (!publication && !accords?.publication) {
    let vitrine = false;
    const bouton = h('button', { class: 'bouton-principal' }, '📣 Demander la publication');
    bouton.addEventListener('click', async () => {
      bouton.disabled = true;
      await o.demander(vitrine);
      notifier({ icone: '📣', texte: 'Demande envoyée à ton mentor !', type: 'succes', duree: 4000 });
      rouvrir({ accords: { publication: Date.now(), vitrine: vitrine ? Date.now() : null } });
    });
    fermer = fenetre(
      '🌍 Mon site',
      h('p', {}, 'Ton site n’est pas encore en ligne. Quand il est prêt, demande à ton mentor de le publier : il aura sa propre adresse et un QR code à montrer à tes proches.'),
      h(
        'div',
        { class: 'avant-publier' },
        h('strong', {}, '🔒 Avant de demander, vérifie que ton site ne montre pas :'),
        h('ul', {}, h('li', {}, 'ton nom de famille, ton adresse, ton école ou ton numéro ;'), h('li', {}, 'des photos de toi ou de tes proches ;'), h('li', {}, 'des informations sur d’autres personnes.')),
        h('p', {}, 'Une fois publié, ton site est visible par toutes les personnes qui ont son adresse. Tu pourras le retirer quand tu veux.'),
      ),
      caseVitrine(false, (oui) => (vitrine = oui)),
      h('div', { class: 'ligne-boutons' }, bouton, telecharger),
    );
    return;
  }

  // 2. Demande envoyée, en attente du mentor
  if (!publication) {
    const annuler = h('button', { class: 'bouton-secondaire' }, 'Annuler ma demande');
    annuler.addEventListener('click', async () => {
      await o.retirer();
      rouvrir({ accords: { publication: null, vitrine: null } });
    });
    fermer = fenetre(
      '🌍 Mon site',
      h('p', { class: 'statut-demande' }, `⏳ Demande envoyée ${new Date(accords.publication).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}. Ton mentor va relire ton site, puis le publier.`),
      h('p', {}, accords.vitrine ? '🖼️ Tu as accepté qu’il apparaisse aussi dans la vitrine.' : 'Il n’apparaîtra pas dans la vitrine.'),
      h('div', { class: 'ligne-boutons' }, annuler, telecharger),
    );
    return;
  }

  // 3. Publié
  const boutonCopier = h('button', { class: 'bouton-secondaire' }, '📋 Copier le lien');
  boutonCopier.addEventListener('click', async () => {
    boutonCopier.textContent = (await copier(publication.url)) ? '✓ Copié !' : 'Oups';
    setTimeout(() => (boutonCopier.textContent = '📋 Copier le lien'), 1500);
  });
  const retirer = h('button', { class: 'bouton-danger' }, '🚫 Retirer mon site d’internet');
  retirer.addEventListener('click', async () => {
    const ok = await confirmer({ titre: 'Retirer ton site ?', texte: 'Il ne sera plus visible à son adresse ni dans la vitrine. Ton travail, lui, reste dans ton atelier : tu pourras redemander la publication plus tard.', ok: 'Retirer', danger: true });
    if (!ok) return;
    await o.retirer();
    notifier({ icone: '🚫', texte: 'Ton site n’est plus en ligne.', duree: 4000 });
    rouvrir({ publication: null, accords: { publication: null, vitrine: null } });
  });
  fermer = fenetre(
    '🌍 Mon site',
    h('div', { class: 'mon-site' }, dessinerQr(publication.url), h('div', {}, h('p', {}, 'Scanne ce QR code avec un téléphone, ou partage le lien :'), h('p', {}, h('a', { href: publication.url, target: '_blank', rel: 'noopener' }, publication.url)), h('p', { class: 'visites' }, `👀 ${visites} visite${visites > 1 ? 's' : ''}`))),
    h('div', { class: 'ligne-boutons' }, boutonCopier, telecharger),
    caseVitrine(Boolean(accords?.vitrine), async (oui) => {
      await o.accordVitrine(oui);
      notifier({ icone: '🖼️', texte: oui ? 'Merci ! Ton mentor pourra l’ajouter à la vitrine.' : 'Ton site a été retiré de la vitrine.', duree: 4000 });
    }),
    h('p', { class: 'aide-mon-site' }, 'Le site en ligne est une copie : quand tu l’améliores, demande à ton mentor de le mettre à jour.'),
    h('div', { class: 'ligne-boutons' }, retirer),
  );
}

// --------------------------------------------------------------------------
//  Charte, à la première connexion (une seule fois)
// --------------------------------------------------------------------------
export function afficherCharte(accepter) {
  return new Promise((termine) => {
    const bouton = h('button', { class: 'bouton-principal' }, 'J’ai compris, c’est parti →');
    const fond = h(
      'div',
      { class: 'fond-modal' },
      h(
        'div',
        { class: 'modal charte', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'titre-charte' },
        h('h2', { id: 'titre-charte' }, 'Bienvenue dans ton atelier !'),
        h('p', {}, 'Avant de commencer, quatre règles pour que tout le monde soit bien ici :'),
        h(
          'ol',
          { class: 'regles-charte' },
          h('li', {}, h('strong', {}, 'Ton lien est secret. '), 'Ne le donne à personne : c’est la clé de ton atelier.'),
          h('li', {}, h('strong', {}, 'Rien de personnel sur ton site. '), 'Ni ton nom de famille, ni ton adresse, ni ton école, ni de photos de toi ou des autres.'),
          h('li', {}, h('strong', {}, 'Reste sympa. '), 'Rien de méchant, de violent ou de choquant.'),
          h('li', {}, h('strong', {}, 'Des images que tu as le droit d’utiliser. '), 'Les tiennes, ou des images libres de droits.'),
        ),
        h('p', { class: 'petit-texte' }, 'Le détail est dans les ', h('a', { href: '/conditions', target: '_blank', rel: 'noopener' }, 'conditions d’utilisation'), ' et la ', h('a', { href: '/confidentialite', target: '_blank', rel: 'noopener' }, 'politique de confidentialité'), '.'),
        h('div', { class: 'modal-actions' }, bouton),
      ),
    );
    bouton.addEventListener('click', async () => {
      bouton.disabled = true;
      await accepter();
      fond.remove();
      termine();
    });
    document.body.append(fond);
    bouton.focus();
  });
}
