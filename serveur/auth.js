// Sessions par cookies signés (HMAC), sans stockage côté serveur.
//   - élève  : « atelier_eleve »  = e.<id>.<epoque>.<signature>
//   - mentor : « atelier_mentor » = m.<expiration>.<signature>
// Les cookies sont HttpOnly (inaccessibles au JavaScript) et SameSite=Strict.
import crypto from 'node:crypto';

export const COOKIE_ELEVE = 'atelier_eleve';
export const COOKIE_MENTOR = 'atelier_mentor';
const DUREE_ELEVE_S = 180 * 24 * 3600; // 6 mois : l'élève n'a pas à retaper son code
const DUREE_MENTOR_S = 7 * 24 * 3600;

export function lireCookies(entete = '') {
  const cookies = {};
  for (const morceau of entete.split(';')) {
    const i = morceau.indexOf('=');
    if (i < 0) continue;
    const nom = morceau.slice(0, i).trim();
    if (!nom || nom in cookies) continue;
    try {
      cookies[nom] = decodeURIComponent(morceau.slice(i + 1).trim());
    } catch {
      /* cookie mal formé : ignoré */
    }
  }
  return cookies;
}

function egaliteSure(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export function creerAuth(config, bdd) {
  // La clé du mentor dépend aussi du mot de passe : le changer déconnecte toutes les sessions mentor.
  const cleEleve = crypto.createHmac('sha256', config.secretSession).update('cle-eleve').digest();
  const cleMentor = crypto.createHmac('sha256', config.secretSession).update('cle-mentor:' + config.motDePasseMentor).digest();
  const signer = (cle, valeur) => crypto.createHmac('sha256', cle).update(valeur).digest('base64url');

  function enteteCookie(nom, valeur, dureeS) {
    const morceaux = [`${nom}=${encodeURIComponent(valeur)}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${dureeS}`];
    if (config.cookiesSecurises) morceaux.push('Secure');
    return morceaux.join('; ');
  }

  function ajouterCookie(res, cookie) {
    const existants = res.getHeader('Set-Cookie');
    res.setHeader('Set-Cookie', [...(existants ? [].concat(existants) : []), cookie]);
  }

  // --- Élève --------------------------------------------------------------
  function connecterEleve(res, eleve) {
    const valeur = `e.${eleve.id}.${eleve.epoque_session}`;
    ajouterCookie(res, enteteCookie(COOKIE_ELEVE, `${valeur}.${signer(cleEleve, valeur)}`, DUREE_ELEVE_S));
  }

  function eleveDepuisCookies(cookies) {
    const brut = cookies[COOKIE_ELEVE];
    if (!brut) return null;
    const i = brut.lastIndexOf('.');
    const valeur = brut.slice(0, i);
    if (i < 0 || !egaliteSure(brut.slice(i + 1), signer(cleEleve, valeur))) return null;
    const [type, id, epoque] = valeur.split('.');
    if (type !== 'e') return null;
    const eleve = bdd.eleveParId(Number(id));
    if (!eleve || String(eleve.epoque_session) !== epoque) return null; // code régénéré ou élève supprimé
    return eleve;
  }

  // --- Mentor -------------------------------------------------------------
  function verifierMotDePasse(motDePasse) {
    const a = crypto.createHash('sha256').update(String(motDePasse || '')).digest();
    const b = crypto.createHash('sha256').update(config.motDePasseMentor).digest();
    return crypto.timingSafeEqual(a, b);
  }

  function connecterMentor(res) {
    const valeur = `m.${Date.now() + DUREE_MENTOR_S * 1000}`;
    ajouterCookie(res, enteteCookie(COOKIE_MENTOR, `${valeur}.${signer(cleMentor, valeur)}`, DUREE_MENTOR_S));
  }

  function mentorDepuisCookies(cookies) {
    const brut = cookies[COOKIE_MENTOR];
    if (!brut) return false;
    const i = brut.lastIndexOf('.');
    const valeur = brut.slice(0, i);
    if (i < 0 || !egaliteSure(brut.slice(i + 1), signer(cleMentor, valeur))) return false;
    const [type, expiration] = valeur.split('.');
    return type === 'm' && Number(expiration) > Date.now();
  }

  function deconnecter(res, nom) {
    ajouterCookie(res, enteteCookie(nom, '', 0));
  }

  // --- Middlewares Express -------------------------------------------------
  const exigerEleve = (req, res, next) => {
    const eleve = eleveDepuisCookies(lireCookies(req.headers.cookie));
    if (!eleve) return res.status(401).json({ erreur: 'Session expirée : reconnecte-toi avec ton code.' });
    req.eleve = eleve;
    next();
  };
  const exigerMentor = (req, res, next) => {
    if (!mentorDepuisCookies(lireCookies(req.headers.cookie))) return res.status(401).json({ erreur: 'Connexion mentor requise.' });
    next();
  };

  return {
    connecterEleve,
    eleveDepuisCookies,
    verifierMotDePasse,
    connecterMentor,
    mentorDepuisCookies,
    deconnecter,
    exigerEleve,
    exigerMentor,
  };
}

/** Limiteur de tentatives très simple, en mémoire (rien n'est écrit sur disque). */
export function creerLimiteur({ max, fenetreMs }) {
  const essais = new Map();
  setInterval(() => {
    const t = Date.now();
    for (const [cle, e] of essais) if (e.fin < t) essais.delete(cle);
  }, fenetreMs).unref();
  return {
    // Retourne true si la tentative est autorisée.
    essayer(cle) {
      const t = Date.now();
      let e = essais.get(cle);
      if (!e || e.fin < t) {
        e = { n: 0, fin: t + fenetreMs };
        essais.set(cle, e);
      }
      e.n += 1;
      return e.n <= max;
    },
    reinitialiser: (cle) => essais.delete(cle),
  };
}

export function ipClient(req) {
  // Derrière Cloudflare Tunnel, la vraie IP est dans CF-Connecting-IP. Elle n'est jamais stockée.
  return String(req.headers['cf-connecting-ip'] || req.ip || req.socket?.remoteAddress || 'inconnue');
}
