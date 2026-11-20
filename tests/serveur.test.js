import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { demarrer, attendreEvt, emettre } from './aide.js';

let t;
beforeAll(async () => {
  t = await demarrer();
});
afterAll(() => t.fermer());

describe('Connexion mentor', () => {
  it('refuse un mauvais mot de passe', async () => {
    await t.agent().post('/api/mentor/connexion').set('X-Atelier', '1').send({ motDePasse: 'faux' }).expect(401);
  });

  it('protège les routes mentor', async () => {
    await t.agent().get('/api/mentor/eleves').expect(401);
  });

  it('exige l’en-tête anti-CSRF', async () => {
    await t.agent().post('/api/mentor/connexion').send({ motDePasse: 'x' }).expect(403);
  });

  it('pose un cookie HttpOnly SameSite=Strict', async () => {
    const r = await t.agent().post('/api/mentor/connexion').set('X-Atelier', '1').send({ motDePasse: 'mot-de-passe-test' }).expect(200);
    const cookie = r.headers['set-cookie'][0];
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
  });
});

describe('Élèves', () => {
  it('seul le mentor crée un élève, avec un pseudo valide', async () => {
    const m = await t.mentor();
    await m.post('/api/mentor/eleves').set('X-Atelier', '1').send({ pseudo: 'A B' }).expect(400);
    await m.post('/api/mentor/eleves').set('X-Atelier', '1').send({ pseudo: 'mentor' }).expect(400);
    const e = await t.nouvelEleve(m, 'alice');
    expect(e.code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(e.lien).toBe(`http://localhost/e/${e.code}`);
    await m.post('/api/mentor/eleves').set('X-Atelier', '1').send({ pseudo: 'alice' }).expect(409);
  });

  it('le code n’est pas stocké en clair', async () => {
    const m = await t.mentor();
    const e = await t.nouvelEleve(m, 'bob');
    const ligne = t.appli.bdd.db.prepare('SELECT * FROM eleves WHERE id = ?').get(e.id);
    expect(JSON.stringify(ligne)).not.toContain(e.code);
  });

  it('le lien personnel connecte l’élève et retire le code de l’URL', async () => {
    const m = await t.mentor();
    const e = await t.nouvelEleve(m, 'carl');
    const a = t.agent();
    const r = await a.get(`/e/${e.code.toLowerCase()}`).expect(303);
    expect(r.headers.location).toBe('/');
    const etat = await a.get('/api/eleve/etat').expect(200);
    expect(etat.body.eleve.pseudo).toBe('carl');
    expect(etat.body.missionCourante).toBe('html-1');
    expect(etat.body.etat.onglets).toEqual(['html']);
    expect(etat.body.code.html).toContain('Écris ton code ici');
  });

  it('un mauvais code est refusé', async () => {
    const r = await t.agent().post('/api/entree').set('X-Atelier', '1').send({ code: 'AAAA-AAAA-AAAA' });
    expect(r.status).toBe(401);
    expect(r.body.erreur).toMatch(/code/);
  });

  it('régénérer le code coupe l’ancienne session', async () => {
    const m = await t.mentor();
    const e = await t.nouvelEleve(m, 'dora');
    const a = await t.connecterEleve(e.code);
    await a.get('/api/eleve/etat').expect(200);
    const r = await m.post(`/api/mentor/eleves/${e.id}/code`).set('X-Atelier', '1').expect(200);
    await a.get('/api/eleve/etat').expect(401);
    await t.connecterEleve(r.body.code);
  });

  it('refuse un code trop gros', async () => {
    const m = await t.mentor();
    const e = await t.nouvelEleve(m, 'gros');
    const a = await t.connecterEleve(e.code);
    await a.put('/api/eleve/projet').set('X-Atelier', '1').send({ html: 'a'.repeat(210 * 1024), css: '', js: '' }).expect(400);
    await a.put('/api/eleve/projet').set('X-Atelier', '1').send({ html: 42, css: '', js: '' }).expect(400);
    await a.put('/api/eleve/projet').set('X-Atelier', '1').send({ html: '<h1>Ok</h1>', css: '', js: '' }).expect(200);
  });
});

describe('Temps réel, missions et déblocages', () => {
  it('le mentor voit le code en direct, la mission et les indices', async () => {
    const m = await t.mentor();
    const e = await t.nouvelEleve(m, 'alex');
    const a = await t.connecterEleve(e.code);
    await a.get('/api/eleve/etat').expect(200);

    const sm = t.socket('/mentor', m);
    const se = t.socket('/eleve', a);
    await Promise.all([attendreEvt(sm, 'connect'), attendreEvt(se, 'connect')]);
    const suivi = await emettre(sm, 'suivre', e.id);
    expect(suivi.ok).toBe(true);
    expect(suivi.fiche.enLigne).toBe(true);

    const recu = attendreEvt(sm, 'eleve:code');
    se.emit('code:maj', { html: '<h1>Mon site</h1>', css: '', js: '' });
    expect((await recu).html).toBe('<h1>Mon site</h1>');

    // Mission html-2 encore verrouillée
    expect((await emettre(se, 'mission:reussie', 'html-2')).ok).toBe(false);
    // Réussite html-1 → html-2 devient disponible
    const r = await emettre(se, 'mission:reussie', 'html-1');
    expect(r.ok).toBe(true);
    const statuts = Object.fromEntries(r.etat.etat.missions.map((x) => [x.id, x.statut]));
    expect(statuts['html-1']).toBe('reussie');
    expect(statuts['html-2']).toBe('disponible');
    expect(statuts['html-3']).toBe('verrouillee');
    expect(statuts['css-1']).toBe('verrouillee');

    // Choisir html-2 prend un instantané (pour « Réinitialiser la mission »)
    expect((await emettre(se, 'mission:choisir', 'html-2')).ok).toBe(true);
    expect((await emettre(se, 'mission:choisir', 'html-5')).ok).toBe(false);
    const inst = await emettre(se, 'mission:reinitialiser', 'html-2');
    expect(inst.code.html).toBe('<h1>Mon site</h1>');

    const etatMentor = attendreEvt(sm, 'eleve:etat');
    se.emit('indice:revele', { missionId: 'html-2', niveau: 1 });
    expect((await etatMentor).progression['html-2'].indices).toBe(1);

    // Le mentor ouvre le module CSS → l'élève est prévenu tout de suite
    const majEleve = attendreEvt(se, 'etat:maj');
    await m.put(`/api/mentor/eleves/${e.id}/deblocages`).set('X-Atelier', '1').send({ cible: 'module:css', etat: 'ouvert' }).expect(200);
    const nouvelEtat = await majEleve;
    expect(nouvelEtat.etat.onglets).toEqual(['html', 'css']);
    expect(nouvelEtat.etat.missions.find((x) => x.id === 'css-1').statut).toBe('disponible');

    // Verrouiller une mission précise
    await m.put(`/api/mentor/eleves/${e.id}/deblocages`).set('X-Atelier', '1').send({ cible: 'mission:css-1', etat: 'ferme' }).expect(200);
    const fiche = (await m.get(`/api/mentor/eleves/${e.id}`).expect(200)).body;
    expect(fiche.etat.missions.find((x) => x.id === 'css-1').statut).toBe('verrouillee');
    await m.put(`/api/mentor/eleves/${e.id}/deblocages`).set('X-Atelier', '1').send({ cible: 'mission:inconnue', etat: 'ferme' }).expect(400);

    // Message du mentor
    const msg = attendreEvt(se, 'message');
    await m.post(`/api/mentor/eleves/${e.id}/messages`).set('X-Atelier', '1').send({ type: 'indice', texte: 'Pense au </p> !' }).expect(201);
    expect((await msg).texte).toBe('Pense au </p> !');

    // Le code est bien enregistré en base à la déconnexion
    se.disconnect();
    await new Promise((ok) => setTimeout(ok, 100));
    expect(t.appli.bdd.projet(e.id).html).toBe('<h1>Mon site</h1>');
    sm.disconnect();
  });

  it('refuse les sockets sans session ou venant d’un autre site', async () => {
    const { io } = await import('socket.io-client');
    const s = io(`http://127.0.0.1:${t.port}/eleve`, { transports: ['websocket'], forceNew: true });
    const err = await attendreEvt(s, 'connect_error');
    expect(err.message).toBe('non-connecte');
    s.close();

    const m = await t.mentor();
    const cookies = m.jar.getCookies({ path: '/', domain: '127.0.0.1', secure: false, script: false });
    const s2 = io(`http://127.0.0.1:${t.port}/mentor`, {
      transports: ['websocket'],
      forceNew: true,
      extraHeaders: { cookie: cookies.map((c) => `${c.name}=${c.value}`).join('; '), origin: 'https://pirate.example' },
    });
    await attendreEvt(s2, 'connect_error');
    s2.close();
  });
});

describe('Publication', () => {
  it('publie une copie figée, sandboxée, et dépublie', async () => {
    const m = await t.mentor();
    const e = await t.nouvelEleve(m, 'pub');
    const a = await t.connecterEleve(e.code);
    await a
      .put('/api/eleve/projet')
      .set('X-Atelier', '1')
      .send({ html: '<h1>Mon <b>site</b></h1>', css: 'h1{color:red}', js: 'console.log("</script><img>")' })
      .expect(200);

    await t.agent().get('/site/pub').expect(404);
    await m.post(`/api/mentor/eleves/${e.id}/publication`).set('X-Atelier', '1').expect(200);

    const r = await t.agent().get('/site/pub').expect(200);
    expect(r.headers['content-security-policy']).toMatch(/^sandbox allow-scripts/);
    expect(r.text).toContain('<title>Mon site</title>');
    expect(r.text).toContain('<h1>Mon <b>site</b></h1>');
    expect(r.text).not.toContain('h1{color:red}'); // module CSS pas encore débloqué
    expect(r.text).not.toContain('console.log');
    expect(r.headers['x-frame-options']).toBeUndefined();
    expect(r.text).toContain('window.__atelierGarde');

    // Copie figée : modifier le projet ne change pas le site publié
    await a.put('/api/eleve/projet').set('X-Atelier', '1').send({ html: '<h1>Brouillon</h1>', css: '', js: '' }).expect(200);
    expect((await t.agent().get('/site/pub')).text).toContain('Mon <b>site</b>');

    await m.delete(`/api/mentor/eleves/${e.id}/publication`).set('X-Atelier', '1').expect(200);
    await t.agent().get('/site/pub').expect(404);
  });

  it('les pages de l’app interdisent d’être affichées dans un cadre', async () => {
    const r = await t.agent().get('/api/sante').expect(200);
    expect(r.headers['x-frame-options']).toBe('DENY');
    expect(r.headers['content-security-policy']).toMatch(/frame-ancestors 'none'/);
  });
});
