// Routes du panneau mentor. Toutes exigent la session mentor (sauf la connexion).
import { Router } from 'express';
import { COOKIE_MENTOR, creerLimiteur, ipClient } from '../auth.js';
import { validerCible, validerMessage, validerPseudo, missionExiste } from '../validation.js';
import { envoyerZip } from '../telechargement.js';
import { BADGES } from '../badges.js';

export function routesMentor({ bdd, auth, service, catalogue, temps, config, sauvegardes, discord }) {
  const r = Router();
  const limiteur = creerLimiteur({ max: 8, fenetreMs: 15 * 60 * 1000 });
  const lien = (code) => `${config.urlPublique}/e/${code}`;

  // En plus de la limite par IP : au-delà de 30 mots de passe faux en 15 min (toutes IP confondues),
  // plus aucun essai n'est accepté pendant 15 min. Impossible à contourner en changeant d'IP.
  const echecsGlobaux = creerLimiteur({ max: 30, fenetreMs: 15 * 60 * 1000 });
  r.post('/connexion', async (req, res) => {
    const ip = ipClient(req);
    if (!limiteur.essayer(ip) || echecsGlobaux.depasse('global')) return res.status(429).json({ erreur: 'Trop de tentatives. Réessaie dans 15 minutes.' });
    if (!auth.verifierMotDePasse(req.body?.motDePasse)) {
      echecsGlobaux.essayer('global');
      await new Promise((r2) => setTimeout(r2, 400)); // ralentit les essais en rafale
      return res.status(401).json({ erreur: 'Mot de passe incorrect.' });
    }
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
  r.get('/missions', (req, res) => res.json({ ...catalogue.public, badges: BADGES }));

  // --- Sauvegardes : consulter et en lancer une. Pas de téléchargement ni de restauration
  //     par le web (volontaire) : la restauration se fait en ligne de commande, site arrêté.
  const limiteSauvegarde = creerLimiteur({ max: 3, fenetreMs: 10 * 60 * 1000 });
  r.get('/sauvegardes', (req, res) => {
    res.json({
      ...sauvegardes.resume(),
      liste: sauvegardes.liste().map(({ nom, raison, chiffre, taille, date, eleves }) => ({ nom, raison, chiffre, taille, date, eleves })),
    });
  });
  r.post('/sauvegardes', (req, res) => {
    if (!limiteSauvegarde.essayer('mentor')) return res.status(429).json({ erreur: 'Doucement : 3 sauvegardes manuelles max toutes les 10 minutes.' });
    try {
      res.status(201).json(sauvegardes.sauvegarder(bdd.db, 'manuel'));
    } catch (e) {
      discord.envoyer(`❌ Sauvegarde manuelle de l’Atelier impossible : ${e.message}`);
      res.status(500).json({ erreur: `Sauvegarde impossible : ${e.message}` });
    }
  });

  // --- Discord : message de test
  r.post('/discord/test', async (req, res) => {
    if (!discord.actif) return res.status(400).json({ erreur: 'DISCORD_WEBHOOK_URL n’est pas configurée.' });
    const ok = await discord.envoyer('✅ Test : les alertes de L’Atelier arrivent bien ici.');
    res.status(ok ? 200 : 502).json(ok ? { ok } : { erreur: 'Discord n’a pas accepté le message (vérifie le webhook).' });
  });
  r.get('/systeme', (req, res) =>
    res.json({ discord: discord.actif, chiffrement: Boolean(config.cleSauvegarde), inactifs: bdd.inactifs(365).map(({ id, pseudo, derniere_activite }) => ({ id, pseudo, derniereActivite: derniere_activite })) }),
  );

  r.get('/eleves', (req, res) => {
    const obligatoires = new Set(catalogue.missions.filter((m) => !m.bonus).map((m) => m.id));
    res.json(
      bdd.listeEleves().map((e) => ({
        ...e,
        reussies: [...bdd.missionsReussies(e.id)].filter((id) => obligatoires.has(id)).length,
        enLigne: temps.estEnLigne(e.id),
        total: obligatoires.size,
      })),
    );
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
    const nouveaux = service.attribuerBadges(req.eleve.id);
    if (nouveaux.length) temps.versEleve(req.eleve.id, 'badges:nouveaux', nouveaux);
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

  // --- Historique des versions du site ---------------------------------------
  const paramVersion = (req, res) => {
    const v = /^\d+$/.test(req.params.version) ? Number(req.params.version) : null;
    if (!v) res.status(404).json({ erreur: 'Version introuvable.' });
    return v;
  };
  r.get('/eleves/:id/versions', (req, res) => res.json(bdd.versions(req.eleve.id)));
  r.get('/eleves/:id/versions/:version', (req, res) => {
    const v = paramVersion(req, res);
    if (!v) return;
    const version = bdd.version(req.eleve.id, v);
    if (!version) return res.status(404).json({ erreur: 'Version introuvable.' });
    res.json(version);
  });
  r.post('/eleves/:id/versions', (req, res) => {
    service.ecrireMaintenant(req.eleve.id);
    const id = bdd.ajouterVersion(req.eleve.id, 'manuel');
    res.status(201).json({ id, inchange: id === null });
  });
  r.post('/eleves/:id/versions/:version/restauration', (req, res) => {
    const v = paramVersion(req, res);
    if (!v) return;
    const code = service.restaurerVersion(req.eleve.id, v);
    if (!code) return res.status(404).json({ erreur: 'Version introuvable.' });
    temps.versEleve(req.eleve.id, 'code:remplacer', { code, raison: 'restauration' });
    temps.versSuivi(req.eleve.id, 'eleve:code', code);
    res.json({ ok: true, code });
  });

  // --- Quiz lancé par le mentor ---------------------------------------------
  r.post('/eleves/:id/quiz', (req, res) => {
    const quiz = service.proposerQuiz(req.eleve.id, { force: true });
    if (!quiz) return res.status(400).json({ erreur: 'Pas encore assez de missions réussies pour un quiz (il faut au moins 3 questions).' });
    if (!temps.estEnLigne(req.eleve.id)) return res.status(409).json({ erreur: 'L’élève n’est pas connecté.' });
    temps.versEleve(req.eleve.id, 'quiz:lancer', quiz);
    res.json({ ok: true });
  });

  // --- Notes privées du mentor (jamais envoyées à l'élève) -------------------
  r.get('/eleves/:id/notes', (req, res) => res.json(bdd.note(req.eleve.id)));
  r.put('/eleves/:id/notes', (req, res) => {
    const texte = req.body?.texte;
    if (typeof texte !== 'string' || texte.length > 20000) return res.status(400).json({ erreur: 'Notes : texte de 20 000 caractères maximum.' });
    bdd.ecrireNote(req.eleve.id, texte);
    res.json(bdd.note(req.eleve.id));
  });

  r.post('/eleves/:id/publication', (req, res) => {
    // Rien n'est publié sans l'accord de l'élève, donné depuis son atelier.
    if (!req.eleve.accord_publication) return res.status(409).json({ erreur: 'L’élève n’a pas encore demandé la publication (bouton « Mon site » de son atelier).' });
    if (!req.eleve.parents_informes) return res.status(409).json({ erreur: 'Indique d’abord que les parents ont été informés (onglet Accès).' });
    service.ecrireMaintenant(req.eleve.id); // on publie la toute dernière version
    bdd.ajouterVersion(req.eleve.id, 'publication');
    const { onglets } = service.etatDeblocage(req.eleve.id);
    const pub = bdd.publier(req.eleve.id, onglets);
    const nouveaux = service.attribuerBadges(req.eleve.id);
    if (nouveaux.length) temps.versEleve(req.eleve.id, 'badges:nouveaux', nouveaux);
    pousserEtat(req.eleve.id);
    res.json({ url: service.urlSite(req.eleve.pseudo), publieLe: pub.publie_le });
  });

  r.put('/eleves/:id/vitrine', (req, res) => {
    if (typeof req.body?.visible !== 'boolean') return res.status(400).json({ erreur: '« visible » doit valoir true ou false.' });
    if (req.body.visible && !req.eleve.accord_vitrine) return res.status(409).json({ erreur: 'L’élève n’a pas accepté que son site soit dans la vitrine.' });
    if (req.body.visible && !bdd.publication(req.eleve.id)) return res.status(409).json({ erreur: 'Le site doit d’abord être publié.' });
    bdd.definirVitrine(req.eleve.id, req.body.visible);
    res.json({ visible: req.body.visible });
  });

  r.get('/eleves/:id/site.zip', (req, res) => envoyerZip(res, req.eleve, service));

  // Information des parents : le mentor note la date (aucune signature demandée).
  r.put('/eleves/:id/parents', (req, res) => {
    if (typeof req.body?.informes !== 'boolean') return res.status(400).json({ erreur: '« informes » doit valoir true ou false.' });
    bdd.definirParentsInformes(req.eleve.id, req.body.informes ? Date.now() : null);
    res.json(service.ficheMentor(req.eleve.id));
  });

  // Droit d'accès / portabilité : toutes les données de l'élève en JSON.
  r.get('/eleves/:id/export', (req, res) => {
    service.ecrireMaintenant(req.eleve.id);
    res.setHeader('Content-Disposition', `attachment; filename="donnees-${req.eleve.pseudo}-${new Date().toISOString().slice(0, 10)}.json"`);
    res.setHeader('Cache-Control', 'no-store');
    res.type('application/json').send(JSON.stringify(bdd.exporter(req.eleve.id), null, 2));
  });

  r.delete('/eleves/:id/publication', (req, res) => {
    bdd.depublier(req.eleve.id);
    pousserEtat(req.eleve.id);
    res.json({ ok: true });
  });

  return r;
}
