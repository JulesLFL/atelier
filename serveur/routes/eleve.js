// Routes de l'élève : connexion par code d'accès et récupération de son état.
import { Router } from 'express';
import { COOKIE_ELEVE, creerLimiteur, ipClient, lireCookies } from '../auth.js';
import { validerCode } from '../validation.js';
import { envoyerZip } from '../telechargement.js';
import { BADGES } from '../badges.js';

export function routesEleve({ bdd, auth, service, catalogue }) {
  const r = Router();
  // 10 essais de code par quart d'heure et par IP : impossible de deviner un code.
  const limiteur = creerLimiteur({ max: 10, fenetreMs: 15 * 60 * 1000 });
  // Limite GLOBALE des échecs (toutes IP confondues) : on ne peut pas la contourner en
  // falsifiant l'en-tête d'IP. 200 codes faux par quart d'heure, face à ~10^17 codes possibles.
  const echecsGlobaux = creerLimiteur({ max: 200, fenetreMs: 15 * 60 * 1000 });

  function connexion(req, res, code) {
    const trop = { statut: 429, erreur: 'Trop d’essais. Attends un quart d’heure avant de réessayer.' };
    if (!limiteur.essayer(ipClient(req)) || echecsGlobaux.depasse('global')) return trop;
    const eleve = bdd.eleveParCode(code);
    if (!eleve) {
      echecsGlobaux.essayer('global');
      return { statut: 401, erreur: 'Ce code ne marche pas. Vérifie-le ou demande-le à ton mentor.' };
    }
    auth.connecterEleve(res, eleve);
    return { eleve };
  }

  // Lien personnel : /e/K7QF-29XM-HD4P → connecte puis renvoie vers l'atelier (le code disparaît de l'URL).
  r.get('/e/:code', (req, res) => {
    const resultat = connexion(req, res, req.params.code);
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.redirect(303, resultat.eleve ? '/atelier' : `/connexion?erreur=${resultat.statut === 429 ? 'trop' : 'code'}`);
  });

  r.post('/api/entree', (req, res) => {
    const resultat = connexion(req, res, req.body?.code);
    if (!resultat.eleve) return res.status(resultat.statut).json({ erreur: resultat.erreur });
    res.json({ ok: true });
  });

  r.post('/api/sortie', (req, res) => {
    auth.deconnecter(res, COOKIE_ELEVE);
    res.json({ ok: true });
  });

  // Pour la page d'accueil : l'élève est-il connecté ? (pseudo seulement)
  r.get('/api/eleve/session', (req, res) => {
    const eleve = auth.eleveDepuisCookies(lireCookies(req.headers.cookie));
    res.json(eleve ? { connecte: true, pseudo: eleve.pseudo } : { connecte: false });
  });

  r.get('/api/missions', auth.exigerEleve, (req, res) => res.json({ ...catalogue.public, badges: BADGES }));

  r.get('/api/eleve/etat', auth.exigerEleve, (req, res) => {
    res.json({
      ...service.etatEleve(req.eleve.id),
      code: service.codeActuel(req.eleve.id),
      messagesNonLus: bdd.messages(req.eleve.id, 20).filter((m) => !m.lu_le).reverse(),
    });
  });

  // Télécharger son site en .zip (index.html + style.css + script.js)
  r.get('/api/eleve/site.zip', auth.exigerEleve, (req, res) => envoyerZip(res, req.eleve, service));

  // Secours quand le temps réel est coupé (ex. fermeture de l'onglet).
  r.put('/api/eleve/projet', auth.exigerEleve, (req, res) => {
    const { valeur, erreur } = validerCode(req.body);
    if (erreur) return res.status(400).json({ erreur });
    service.enregistrerCode(req.eleve.id, valeur);
    service.ecrireMaintenant(req.eleve.id);
    res.json({ ok: true });
  });

  return r;
}
