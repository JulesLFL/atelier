// Temps réel (Socket.IO).
//   Espace « /eleve »  : l'élève envoie son code, ses choix de mission, ses réussites.
//   Espace « /mentor » : le mentor suit un élève en direct (room « suivi:<id> »).
import { Server } from 'socket.io';
import { lireCookies } from './auth.js';
import { validerCode, missionExiste } from './validation.js';

const INTERVALLE_ACTIVITE_S = 30;

export function creerTempsReel(serveurHttp, { bdd, auth, service, catalogue, config }) {
  const hoteAutorise = new URL(config.urlPublique).host;
  const io = new Server(serveurHttp, {
    serveClient: false,
    maxHttpBufferSize: 1e6, // 1 Mo par message : 3 onglets × 200 Ko max
    // Refuse les connexions venant d'un autre site (protection contre le détournement de WebSocket).
    allowRequest(req, rappel) {
      const origine = req.headers.origin;
      if (!origine) return rappel(null, true);
      try {
        const hote = new URL(origine).host;
        rappel(null, hote === req.headers.host || hote === hoteAutorise);
      } catch {
        rappel(null, false);
      }
    },
  });

  const eleves = io.of('/eleve');
  const mentors = io.of('/mentor');
  const connexions = new Map(); // eleveId -> nombre d'onglets ouverts

  const estEnLigne = (id) => (connexions.get(id) || 0) > 0;
  const versEleve = (id, evt, donnees) => eleves.to(`eleve:${id}`).emit(evt, donnees);
  const versSuivi = (id, evt, donnees) => mentors.to(`suivi:${id}`).emit(evt, donnees);
  const presence = (id) => mentors.emit('eleve:presence', { id, enLigne: estEnLigne(id) });
  const etatPourMentor = (id) => versSuivi(id, 'eleve:etat', service.ficheMentor(id));

  // --- Élève --------------------------------------------------------------
  eleves.use((socket, next) => {
    const eleve = auth.eleveDepuisCookies(lireCookies(socket.handshake.headers.cookie));
    if (!eleve) return next(new Error('non-connecte'));
    socket.data.eleveId = eleve.id;
    next();
  });

  eleves.on('connection', (socket) => {
    const id = socket.data.eleveId;
    socket.join(`eleve:${id}`);
    connexions.set(id, (connexions.get(id) || 0) + 1);
    bdd.noterPassage(id);
    presence(id);
    let derniereActivite = 0;
    const repondre = (rappel, valeur) => typeof rappel === 'function' && rappel(valeur);

    socket.on('code:maj', (code, rappel) => {
      const { valeur, erreur } = validerCode(code);
      if (erreur) return repondre(rappel, { ok: false, erreur });
      service.enregistrerCode(id, valeur);
      versSuivi(id, 'eleve:code', valeur);
      repondre(rappel, { ok: true });
    });

    socket.on('mission:choisir', (missionId, rappel) => {
      if (!missionExiste(catalogue, missionId) || !service.choisirMission(id, missionId)) return repondre(rappel, { ok: false });
      repondre(rappel, { ok: true });
      etatPourMentor(id);
    });

    socket.on('mission:reinitialiser', (missionId, rappel) => {
      if (!missionExiste(catalogue, missionId)) return repondre(rappel, { ok: false });
      const inst = bdd.instantane(id, missionId);
      repondre(rappel, inst ? { ok: true, code: { html: inst.html, css: inst.css, js: inst.js } } : { ok: false });
    });

    socket.on('indice:revele', (donnees) => {
      const niveau = Number(donnees?.niveau);
      if (!missionExiste(catalogue, donnees?.missionId) || ![1, 2].includes(niveau)) return;
      bdd.noterIndice(id, donnees.missionId, niveau);
      etatPourMentor(id);
    });

    socket.on('mission:reussie', (missionId, rappel) => {
      if (!missionExiste(catalogue, missionId)) return repondre(rappel, { ok: false });
      const ok = service.reussirMission(id, missionId);
      repondre(rappel, { ok, etat: service.etatEleve(id) });
      if (ok) etatPourMentor(id);
    });

    socket.on('message:lu', (messageId) => {
      if (Number.isInteger(messageId)) bdd.marquerLu(id, messageId);
    });

    // Signal envoyé toutes les 30 s si l'élève a tapé ou bougé la souris : sert à compter le temps actif.
    socket.on('activite', () => {
      const t = Date.now();
      if (t - derniereActivite < (INTERVALLE_ACTIVITE_S - 5) * 1000) return; // anti-triche basique
      derniereActivite = t;
      bdd.noterActivite(id, INTERVALLE_ACTIVITE_S);
    });

    socket.on('disconnect', () => {
      connexions.set(id, Math.max(0, (connexions.get(id) || 1) - 1));
      service.ecrireMaintenant(id);
      if (bdd.eleveParId(id)) bdd.noterPassage(id);
      presence(id);
    });
  });

  // --- Mentor -------------------------------------------------------------
  mentors.use((socket, next) => {
    if (!auth.mentorDepuisCookies(lireCookies(socket.handshake.headers.cookie))) return next(new Error('non-connecte'));
    next();
  });

  mentors.on('connection', (socket) => {
    socket.on('suivre', (eleveId, rappel) => {
      for (const salle of socket.rooms) if (salle.startsWith('suivi:')) socket.leave(salle);
      const fiche = Number.isInteger(eleveId) && service.ficheMentor(eleveId);
      if (!fiche) return typeof rappel === 'function' && rappel({ ok: false });
      socket.join(`suivi:${eleveId}`);
      if (typeof rappel === 'function') rappel({ ok: true, fiche: { ...fiche, enLigne: estEnLigne(eleveId) } });
    });
  });

  return {
    io,
    estEnLigne,
    versEleve,
    versSuivi,
    // Coupe les connexions d'un élève (code régénéré ou compte supprimé).
    deconnecterEleve(id) {
      versEleve(id, 'session:terminee');
      eleves.in(`eleve:${id}`).disconnectSockets(true);
    },
  };
}
