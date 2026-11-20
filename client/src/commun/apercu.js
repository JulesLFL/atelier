// Aperçu en direct et banc d'essai des missions.
//
// SÉCURITÉ : la page de l'élève tourne dans une iframe
//   <iframe sandbox="allow-scripts" srcdoc="…">   (JAMAIS allow-same-origin)
// Son origine est donc « opaque » : son JavaScript ne peut ni lire l'application,
// ni ses cookies, ni appeler l'API. On ne lui parle que par postMessage, et on
// vérifie toujours que les messages viennent bien d'une de nos iframes.
import sonde from './sonde.js?raw';
import { assemblerPage, ligneDebutJs } from '@partage/regles.js';
import { protegerBoucles } from '@partage/garde-boucles.js';

const SANDBOX = 'allow-scripts';

export function construirePage(code, onglets, role) {
  const enTete = `<script data-role="${role}">\n${sonde}\n</script>`;
  const page = assemblerPage({ ...code, js: protegerBoucles(code.js || '') }, { onglets, enTete });
  const lignes = page.split('\n');
  return {
    page,
    debutJs: ligneDebutJs(page),
    debutHtml: lignes.indexOf('<body>') + 2,
    finHtml: lignes.indexOf('<body>') + 1 + (code.html || '').split('\n').length,
  };
}

/** Traduit un numéro de ligne de la page complète en « ligne N de ton JS/HTML ». */
export function localiser(infos, ligne) {
  if (!ligne || !infos) return null;
  if (infos.debutJs && ligne >= infos.debutJs) return { onglet: 'js', ligne: ligne - infos.debutJs + 1 };
  if (ligne >= infos.debutHtml && ligne <= infos.finHtml) return { onglet: 'html', ligne: ligne - infos.debutHtml + 1 };
  return null;
}

function creerCadre(titre) {
  const cadre = document.createElement('iframe');
  cadre.setAttribute('sandbox', SANDBOX);
  cadre.setAttribute('title', titre);
  cadre.setAttribute('referrerpolicy', 'no-referrer');
  cadre.setAttribute('loading', 'eager');
  return cadre;
}

/**
 * @param {HTMLElement} conteneur  élément qui accueille l'aperçu visible
 * @param {{ surMessage?: (msg: object, infos: object) => void, surRechargement?: () => void, banc?: boolean }} options
 */
export function creerApercu(conteneur, { surMessage, surRechargement, banc = true } = {}) {
  const fenetres = new Map(); // contentWindow -> { cadre, infos, role, ... }
  let visible = null; // cadre affiché
  let entrant = null; // cadre en cours de chargement
  let scrollY = 0;

  window.addEventListener('message', (e) => {
    const f = fenetres.get(e.source);
    if (!f || !e.data || e.data.atelier !== true || e.data.role !== f.role) return;
    const msg = e.data;
    if (f.role === 'banc') return f.recevoir?.(msg);
    // Seuls les messages de la page la plus récente comptent.
    if (f.cadre !== entrant && f.cadre !== visible) return;
    if (entrant && f.cadre === visible) return;
    if (msg.type === 'scroll') scrollY = msg.y;
    else if (msg.type === 'pret') {
      e.source.postMessage({ atelier: true, type: 'scroll', y: scrollY }, '*');
      surMessage?.(msg, f.infos);
    } else surMessage?.(msg, f.infos);
  });

  function retirer(cadre) {
    if (!cadre) return;
    for (const [fen, f] of fenetres) if (f.cadre === cadre) fenetres.delete(fen);
    cadre.remove();
  }

  /** Recharge l'aperçu avec le nouveau code (double tampon : pas de flash blanc). */
  function mettreAJour(code, onglets) {
    const infos = construirePage(code, onglets, 'apercu');
    retirer(entrant);
    const cadre = creerCadre('Aperçu de ta page');
    cadre.className = 'apercu-cadre apercu-entrant';
    entrant = cadre;
    surRechargement?.();
    cadre.addEventListener('load', () => {
      if (entrant !== cadre) return;
      retirer(visible);
      visible = cadre;
      entrant = null;
      cadre.classList.remove('apercu-entrant');
    });
    conteneur.append(cadre);
    fenetres.set(cadre.contentWindow, { cadre, infos, role: 'apercu' });
    cadre.srcdoc = infos.page;
  }

  // --- Banc d'essai : une iframe invisible, recréée à chaque vérification ----------
  let enCours = null;
  let enAttente = null;

  function executerVerification({ code, onglets, verifications, resoudre }) {
    const infos = construirePage(code, onglets, 'banc');
    const cadre = creerCadre('Vérification de la mission');
    cadre.className = 'banc-cadre';
    cadre.setAttribute('aria-hidden', 'true');
    cadre.tabIndex = -1;
    const id = Math.random().toString(36).slice(2);
    let fini = false;
    const terminer = (resultats) => {
      if (fini) return;
      fini = true;
      clearTimeout(minuterie);
      retirer(cadre);
      resoudre(resultats);
      enCours = null;
      if (enAttente) {
        const suivant = enAttente;
        enAttente = null;
        enCours = suivant;
        executerVerification(suivant);
      }
    };
    const minuterie = setTimeout(() => terminer(verifications.map(() => false)), 12000);
    const f = {
      cadre,
      infos,
      role: 'banc',
      recevoir(msg) {
        if (msg.type === 'pret') {
          cadre.contentWindow?.postMessage({ atelier: true, type: 'verifier', id, verifications, source: code }, '*');
        } else if (msg.type === 'resultats' && msg.id === id && Array.isArray(msg.resultats)) {
          terminer(verifications.map((_, i) => msg.resultats[i] === true));
        }
      },
    };
    document.body.append(cadre);
    fenetres.set(cadre.contentWindow, f);
    cadre.srcdoc = infos.page;
  }

  /**
   * Vérifie une mission sur une copie fraîche de la page.
   * @returns {Promise<boolean[]|null>} null si une vérification plus récente a pris la place.
   */
  function verifier(code, onglets, verifications) {
    if (!banc) return Promise.resolve(null);
    return new Promise((resoudre) => {
      const demande = { code, onglets, verifications, resoudre };
      if (enCours) {
        enAttente?.resoudre(null);
        enAttente = demande;
      } else {
        enCours = demande;
        executerVerification(demande);
      }
    });
  }

  return { mettreAJour, verifier };
}
