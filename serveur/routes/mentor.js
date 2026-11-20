// Routes du panneau mentor. Toutes exigent la session mentor (sauf la connexion).
import { Router } from 'express';
import { COOKIE_MENTOR, creerLimiteur, ipClient } from '../auth.js';
import { validerCible, validerMessage, validerPseudo, missionExiste } from '../validation.js';

export function routesMentor({ bdd, auth, service, catalogue, temps, config }) {
  const r = Router();
  const limiteur = creerLimiteur({ max: 8, fenetreMs: 15 * 60 * 1000 });
  const lien = (code) => `${config.urlPublique}/e/${code}`;

  r.post('/connexion', (req, res) => {
    const ip = ipClient(req);
    if (!limiteur.essayer(ip)) return res.status(429).json({ erreur: 'Trop de tentatives. Réessaie dans 15 minutes.' });
    if (!auth.verifierMotDePasse(req.body?.motDePasse)) return res.status(401).json({ erreur: 'Mot de passe incorrect.' });
    limiteur.reinitialiser(ip);
    auth.connecterMentor(res);
    res.json({ ok: true });
  });

  r.post('/deconnexion', (req, res) => {
    auth.deconnecter(res, COOKIE_MENTOR);
    res.json({ ok: true });
  });

  r.use(auth.exigerMentor);

  r.get('/session', (req, res) => res.json({ ok: true }));
  r.get('/missions', (req, res) => res.json(catalogue.public));

  r.get('/eleves', (req, res) => {
    res.json(bdd.listeEleves().map((e) => ({ ...e, enLigne: temps.estEnLigne(e.id), total: catalogue.missions.length })));
  });

  r.post('/eleves', (req, res) => {
    const { valeur: pseudo, erreur } = validerPseudo(req.body?.pseudo);
    if (erreur) return res.status(400).json({ erreur });
    if (bdd.eleveParPseudo(pseudo)) return res.status(409).json({ erreur: 'Ce pseudo existe déjà.' });
    const { eleve, code } = bdd.creerEleve(pseudo);
    res.status(201).json({ id: eleve.id, pseudo, code, lien: lien(code) });
  });

  // Paramètre :id → élève existant, sinon 404.
  r.param('id', (req, res, next, id) => {
    const eleve = /^\d+$/.test(id) ? bdd.eleveParId(Number(id)) : null;
    if (!eleve) return res.status(404).json({ erreur: 'Élève introuvable.' });
    req.eleve = eleve;
    next();
  });

  const pousserEtat = (id) => {
    const etat = service.etatEleve(id);
    temps.versEleve(id, 'etat:maj', etat);
    temps.versSuivi(id, 'eleve:etat', service.ficheMentor(id));
  };

  r.get('/eleves/:id', (req, res) => res.json({ ...service.ficheMentor(req.eleve.id), enLigne: temps.estEnLigne(req.eleve.id) }));

  r.post('/eleves/:id/code', (req, res) => {
    const code = bdd.regenererCode(req.eleve.id);
    temps.deconnecterEleve(req.eleve.id); // l'ancien lien ne marche plus
    res.json({ code, lien: lien(code) });
  });

  r.delete('/eleves/:id', (req, res) => {
    temps.deconnecterEleve(req.eleve.id);
    service.ecrireMaintenant(req.eleve.id);
    bdd.supprimerEleve(req.eleve.id);
    res.json({ ok: true });
  });

  r.put('/eleves/:id/deblocages', (req, res) => {
    const { cible, etat } = req.body || {};
    if (!validerCible(catalogue, cible)) return res.status(400).json({ erreur: 'Cible inconnue.' });
    if (![null, 'ouvert', 'ferme'].includes(etat ?? null)) return res.status(400).json({ erreur: 'État invalide.' });
    bdd.definirDeblocage(req.eleve.id, cible, etat ?? null);
    pousserEtat(req.eleve.id);
    res.json(service.ficheMentor(req.eleve.id));
  });

  r.post('/eleves/:id/missions/:mission/validation', (req, res) => {
    if (!missionExiste(catalogue, req.params.mission)) return res.status(404).json({ erreur: 'Mission inconnue.' });
    service.reussirMission(req.eleve.id, req.params.mission, true);
    temps.versEleve(req.eleve.id, 'mission:validee', { missionId: req.params.mission });
    pousserEtat(req.eleve.id);
    res.json(service.ficheMentor(req.eleve.id));
  });

  r.delete('/eleves/:id/missions/:mission/validation', (req, res) => {
    if (!missionExiste(catalogue, req.params.mission)) return res.status(404).json({ erreur: 'Mission inconnue.' });
    bdd.annulerReussite(req.eleve.id, req.params.mission);
    pousserEtat(req.eleve.id);
    res.json(service.ficheMentor(req.eleve.id));
  });

  r.post('/eleves/:id/messages', (req, res) => {
    const { valeur, erreur } = validerMessage(req.body?.type, req.body?.texte);
    if (erreur) return res.status(400).json({ erreur });
    const message = bdd.ajouterMessage(req.eleve.id, valeur.type, valeur.texte);
    temps.versEleve(req.eleve.id, 'message', message);
    res.status(201).json(message);
  });

  r.post('/eleves/:id/publication', (req, res) => {
    service.ecrireMaintenant(req.eleve.id); // on publie la toute dernière version
    const { onglets } = service.etatDeblocage(req.eleve.id);
    const pub = bdd.publier(req.eleve.id, onglets);
    pousserEtat(req.eleve.id);
    res.json({ url: service.urlSite(req.eleve.pseudo), publieLe: pub.publie_le });
  });

  r.delete('/eleves/:id/publication', (req, res) => {
    bdd.depublier(req.eleve.id);
    pousserEtat(req.eleve.id);
    res.json({ ok: true });
  });

  return r;
}
