// Outils communs aux tests : une application complète avec une base en mémoire.
import request from 'supertest';
import { io as ioClient } from 'socket.io-client';
import { chargerConfig } from '../serveur/config.js';
import { creerApplication } from '../serveur/app.js';

export const MDP = 'mot-de-passe-test';

export async function demarrer() {
  const config = chargerConfig({
    MENTOR_PASSWORD: MDP,
    SESSION_SECRET: 'x'.repeat(40),
    PUBLIC_URL: 'http://localhost',
    COOKIE_SECURE: 'false',
  });
  const appli = await creerApplication(config, { front: false, fichierBdd: ':memory:' });
  await new Promise((ok) => appli.serveur.listen(0, ok));
  const port = appli.serveur.address().port;
  const agent = () => request.agent(appli.serveur);

  async function mentor() {
    const a = agent();
    await a.post('/api/mentor/connexion').set('X-Atelier', '1').send({ motDePasse: MDP }).expect(200);
    return a;
  }

  async function nouvelEleve(a, pseudo = 'alex') {
    const r = await a.post('/api/mentor/eleves').set('X-Atelier', '1').send({ pseudo }).expect(201);
    return r.body;
  }

  async function connecterEleve(code) {
    const a = agent();
    await a.post('/api/entree').set('X-Atelier', '1').send({ code }).expect(200);
    return a;
  }

  function socket(espace, agentConnecte) {
    const cookies = agentConnecte.jar.getCookies({ path: '/', domain: '127.0.0.1', secure: false, script: false });
    const s = ioClient(`http://127.0.0.1:${port}${espace}`, {
      transports: ['websocket'],
      extraHeaders: { cookie: cookies.map((c) => `${c.name}=${c.value}`).join('; ') },
      forceNew: true,
    });
    return s;
  }

  const fermer = () => new Promise((ok) => appli.temps.io.close(() => ok()));
  return { appli, port, agent, mentor, nouvelEleve, connecterEleve, socket, fermer };
}

export const attendreEvt = (s, evt) => new Promise((ok) => s.once(evt, ok));
export const emettre = (s, evt, ...args) => new Promise((ok) => s.emit(evt, ...args, ok));
