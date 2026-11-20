// Routes de l'élève : connexion par code d'accès et récupération de son état.
import { Router } from 'express';
import { COOKIE_ELEVE, creerLimiteur, ipClient } from '../auth.js';
import { validerCode } from '../validation.js';

export function routesEleve({ bdd, auth, service, catalogue }) {
  const r = Router();
  // 10 essais de code par quart d'heure et par IP : impossible de deviner un code.
  const limiteur = creerLimiteur({ max: 10, fenetreMs: 15 * 60 * 1000 });

  function connexion(req, res, code) {
    if (!limiteur.essayer(ipClient(req))) return { statut: 429, erreur: 'Trop d’essais. Attends un quart d’heure avant de réessayer.' };
    const eleve = bdd.eleveParCode(code);
    if (!eleve) return { statut: 401, erreur: 'Ce code ne marche pas. Vérifie-le ou demande-le à ton mentor.' };
    auth.connecterEleve(res, eleve);
    return { eleve };
  }

  // Lien personnel : /e/K7QF-29XM-HD4P → connecte puis renvoie vers l'atelier (le code disparaît de l'URL).
  r.get('/e/:code', (req, res) => {
    const resultat = connexion(req, res, req.params.code);
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.redirect(303, resultat.eleve ? '/' : `/entree?erreur=${resultat.statut === 429 ? 'trop' : 'code'}`);
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

  r.get('/api/missions', auth.exigerEleve, (req, res) => res.json(catalogue.public));

  r.get('/api/eleve/etat', auth.exigerEleve, (req, res) => {
    res.json({
      ...service.etatEleve(req.eleve.id),
      code: service.codeActuel(req.eleve.id),
      messagesNonLus: bdd.messages(req.eleve.id, 20).filter((m) => !m.lu_le).reverse(),
    });
  });

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
