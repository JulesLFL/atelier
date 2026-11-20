// Panneau mentor : historique des versions, notes privées, fenêtre « Système » (sauvegardes, Discord).
import { api } from '../commun/api.js';
import { h, vider, debounce, dateRelative, copier } from '../commun/dom.js';
import { creerApercu } from '../commun/apercu.js';
import { notifier, confirmer, fenetre } from '../commun/notifications.js';

const RAISONS = {
  seance: '🕓 Début de séance',
  publication: '🌍 Publication',
  'avant-restauration': '🛟 Juste avant une restauration',
  manuel: '📸 Créée par toi',
};
const taille = (o) => (o > 1048576 ? `${(o / 1048576).toFixed(1)} Mo` : o > 1024 ? `${Math.ceil(o / 1024)} Ko` : `${o} o`);
const dateLongue = (ms) => new Date(ms).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// -----------------------------------------------------------------------------
//  Historique des versions du site
// -----------------------------------------------------------------------------
export async function ongletHistorique(c, { M }) {
  const id = M.selection;
  const liste = h('ul', { class: 'liste-versions' });
  const cadre = h('div', { class: 'cadre-apercu' });
  const titre = h('p', { class: 'titre-version' }, 'Choisis une version à gauche pour la voir.');
  const boutonRestaurer = h('button', { class: 'bouton-principal', disabled: true }, '♻️ Restaurer cette version');
  const apercu = creerApercu(cadre, { banc: false });
  let choisie = null;

  async function charger() {
    const versions = await api('GET', `/api/mentor/eleves/${id}/versions`);
    vider(
      liste,
      versions.length
        ? versions.map((v) =>
            h(
              'li',
              {},
              h(
                'button',
                { class: `version${choisie === v.id ? ' choisie' : ''}`, onclick: () => voir(v) },
                h('strong', {}, dateLongue(v.cree_le)),
                h('span', {}, RAISONS[v.raison] || v.raison),
                h('small', {}, `${dateRelative(v.cree_le)} · ${taille(v.taille)}`),
              ),
            ),
          )
        : h('li', { class: 'vide' }, 'Pas encore de version. Une copie est faite automatiquement au début de chaque séance.'),
    );
  }

  async function voir(v) {
    choisie = v.id;
    liste.querySelectorAll('.version').forEach((b) => b.classList.toggle('choisie', b.querySelector('strong').textContent === dateLongue(v.cree_le)));
    const version = await api('GET', `/api/mentor/eleves/${id}/versions/${v.id}`);
    apercu.mettreAJour(version, ['html', 'css', 'js']);
    titre.textContent = `${RAISONS[v.raison] || v.raison} · ${dateLongue(v.cree_le)}`;
    boutonRestaurer.disabled = false;
  }

  boutonRestaurer.addEventListener('click', async () => {
    if (!choisie) return;
    const ok = await confirmer({
      titre: 'Restaurer cette version ?',
      texte: 'Le code actuel de l’élève sera remplacé par celui de cette version. Pas de risque : le code actuel est d’abord gardé dans l’historique, et l’élève peut faire Ctrl+Z.',
      ok: '♻️ Restaurer',
    });
    if (!ok) return;
    try {
      await api('POST', `/api/mentor/eleves/${id}/versions/${choisie}/restauration`);
      notifier({ icone: '♻️', texte: 'Version restaurée : l’éditeur de l’élève est à jour.', type: 'succes', duree: 4000 });
      choisie = null;
      boutonRestaurer.disabled = true;
      await charger();
    } catch (e) {
      notifier({ icone: '⚠️', texte: e.message, type: 'erreur' });
    }
  });

  const creer = async () => {
    const r = await api('POST', `/api/mentor/eleves/${id}/versions`);
    notifier({ icone: '📸', texte: r.inchange ? 'Rien n’a changé depuis la dernière version.' : 'Version enregistrée.', duree: 3000, type: 'succes' });
    await charger();
  };

  vider(
    c,
    h('div', { class: 'ligne entete-historique' }, h('p', { class: 'aide-onglet' }, 'Une copie du site est gardée à chaque début de séance, à chaque publication et avant chaque restauration (60 versions max).'), h('button', { class: 'bouton-secondaire', onclick: creer }, '📸 Créer une version maintenant')),
    h('div', { class: 'grille-historique' }, liste, h('div', { class: 'zone-apercu-version' }, h('div', { class: 'ligne' }, titre, boutonRestaurer), cadre)),
  );
  await charger();
}

// -----------------------------------------------------------------------------
//  Notes privées (jamais visibles par l'élève)
// -----------------------------------------------------------------------------
export async function ongletNotes(c, { M }) {
  const id = M.selection;
  const zone = h('textarea', { class: 'champ zone-notes', maxlength: 20000, spellcheck: 'true', placeholder: 'Tes notes sur cet élève : ce que vous avez vu, ce qui coince, les idées pour la prochaine fois…', 'aria-label': 'Notes privées' });
  const etat = h('span', { class: 'etat-notes', 'aria-live': 'polite' });
  const { texte, maj_le } = await api('GET', `/api/mentor/eleves/${id}/notes`);
  zone.value = texte;
  etat.textContent = maj_le ? `Enregistré ${dateRelative(maj_le)}` : '';

  const enregistrer = debounce(async () => {
    try {
      await api('PUT', `/api/mentor/eleves/${id}/notes`, { texte: zone.value });
      etat.textContent = '✓ Enregistré';
    } catch (e) {
      etat.textContent = `⚠️ ${e.message}`;
    }
  }, 700);
  zone.addEventListener('input', () => {
    etat.textContent = '…';
    enregistrer();
  });
  const nouvelleSeance = () => {
    const titre = `## Séance du ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}\n- \n\n`;
    zone.value = titre + zone.value;
    zone.focus();
    zone.setSelectionRange(titre.length - 2, titre.length - 2);
    enregistrer();
  };
  vider(
    c,
    h('div', { class: 'ligne' }, h('p', { class: 'aide-onglet' }, '🔒 Notes privées : l’élève ne les voit jamais. Enregistrement automatique.'), h('button', { class: 'bouton-secondaire', onclick: nouvelleSeance }, '+ Séance du jour'), etat),
    zone,
  );
}

// -----------------------------------------------------------------------------
//  Système : sauvegardes et Discord
// -----------------------------------------------------------------------------
export async function verifierSysteme(el) {
  if (!el) return;
  try {
    const [s, systeme] = await Promise.all([api('GET', '/api/mentor/sauvegardes'), api('GET', '/api/mentor/systeme')]);
    const vieille = s.derniereAuto && Date.now() - s.derniereAuto > 48 * 3600 * 1000;
    const probleme = s.erreur
      ? 'Dernière sauvegarde en échec'
      : vieille
        ? 'Pas de sauvegarde depuis 2 jours'
        : !s.chiffrement
          ? 'Sauvegardes non chiffrées'
          : systeme.inactifs.length
            ? `💤 ${systeme.inactifs.length} compte(s) inactif(s) depuis 1 an`
            : null;
    vider(el, probleme && h('button', { class: 'alerte-systeme', onclick: () => ouvrirSysteme(el) }, `⚠️ ${probleme}`));
  } catch {
    /* rien */
  }
}

function commande(texte) {
  const bouton = h('button', { class: 'bouton-mini' }, '📋');
  bouton.addEventListener('click', async () => {
    bouton.textContent = (await copier(texte)) ? '✓' : '✗';
    setTimeout(() => (bouton.textContent = '📋'), 1500);
  });
  return h('div', { class: 'commande' }, h('code', {}, texte), bouton);
}

export async function ouvrirSysteme(alerte = document.getElementById('alerte-systeme')) {
  const [s, systeme] = await Promise.all([api('GET', '/api/mentor/sauvegardes'), api('GET', '/api/mentor/systeme')]);
  const liste = h(
    'table',
    { class: 'table-missions table-sauvegardes' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Date'), h('th', {}, 'Type'), h('th', {}, 'Taille'), h('th', {}, ''))),
    h(
      'tbody',
      {},
      s.liste.slice(0, 12).map((x) => h('tr', {}, h('td', {}, dateLongue(x.date)), h('td', {}, x.raison), h('td', {}, taille(x.taille)), h('td', { title: x.chiffre ? 'Chiffrée' : 'NON chiffrée' }, x.chiffre ? '🔒' : '⚠️'))),
    ),
  );
  const boutonSauver = h('button', { class: 'bouton-principal' }, '💾 Sauvegarder maintenant');
  boutonSauver.addEventListener('click', async () => {
    boutonSauver.disabled = true;
    try {
      const r = await api('POST', '/api/mentor/sauvegardes');
      notifier({ icone: '💾', texte: `Sauvegarde faite (${taille(r.taille)}).`, type: 'succes', duree: 4000 });
      fermer();
      ouvrirSysteme(alerte);
      verifierSysteme(alerte);
    } catch (e) {
      notifier({ icone: '⚠️', texte: e.message, type: 'erreur' });
      boutonSauver.disabled = false;
    }
  });
  const boutonDiscord = h('button', { class: 'bouton-secondaire', disabled: !systeme.discord }, '🔔 Envoyer un message de test');
  boutonDiscord.addEventListener('click', async () => {
    try {
      await api('POST', '/api/mentor/discord/test');
      notifier({ icone: '🔔', texte: 'Message envoyé sur Discord.', type: 'succes', duree: 3000 });
    } catch (e) {
      notifier({ icone: '⚠️', texte: e.message, type: 'erreur' });
    }
  });

  const fermer = fenetre(
    '⚙️ Système',
    h('h3', { class: 'titre-section' }, '💾 Sauvegardes'),
    h(
      'ul',
      { class: 'etat-systeme' },
      h('li', {}, s.chiffrement ? '🔒 Chiffrées (AES-256-GCM)' : '⚠️ NON chiffrées : ajoute la variable SAUVEGARDE_CLE (voir README)'),
      h('li', {}, s.derniere ? `Dernière : ${dateRelative(s.derniere.date)} (${s.derniere.raison})` : 'Aucune sauvegarde pour l’instant (la première automatique se fait 1 minute après le démarrage).'),
      h('li', {}, `${s.nombre} sauvegarde${s.nombre > 1 ? 's' : ''} · ${taille(s.tailleTotale)} · une automatique par jour, 14 gardées`),
      s.erreur && h('li', { class: 'erreur-systeme' }, `❌ Échec ${dateRelative(s.erreur.date)} : ${s.erreur.message}`),
    ),
    s.liste.length ? liste : null,
    h('div', { class: 'ligne' }, boutonSauver),
    h(
      'details',
      { class: 'aide-restauration' },
      h('summary', {}, 'Comment restaurer une sauvegarde ?'),
      h('p', {}, 'Par sécurité, une restauration ne se fait jamais depuis le site : seulement en ligne de commande, site arrêté. Dans TrueNAS › System › Shell :'),
      commande('docker exec atelier node serveur/outils/sauvegardes.js liste'),
      commande('docker stop atelier'),
      commande("CLE=$(docker inspect atelier --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^SAUVEGARDE_CLE=//p')"),
      commande('docker run --rm --volumes-from atelier -e SAUVEGARDE_CLE="$CLE" atelier:latest node serveur/outils/sauvegardes.js restaurer <nom-du-fichier>'),
      commande('docker start atelier'),
      h('p', {}, 'La base actuelle est d’abord mise de côté (sauvegarde « avant-restauration »). Détails dans le README.'),
    ),
    h('h3', { class: 'titre-section' }, '💤 Comptes inactifs depuis plus d’un an'),
    systeme.inactifs.length
      ? h('p', {}, `À supprimer (engagement de la politique de confidentialité) : ${systeme.inactifs.map((e) => e.pseudo).join(', ')}. Pense à exporter leurs données ou leur site avant, si besoin.`)
      : h('p', {}, 'Aucun.'),
    h('h3', { class: 'titre-section' }, '🔔 Alertes Discord'),
    h('p', {}, systeme.discord ? 'Activées : connexion d’un élève seul, module terminé, quiz, sauvegarde en échec.' : 'Désactivées. Ajoute la variable DISCORD_WEBHOOK_URL pour les activer (voir README).'),
    boutonDiscord,
  );
}
