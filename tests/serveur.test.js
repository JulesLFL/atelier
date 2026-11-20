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

describe('Limites d’essais', () => {
  it('limite globale : falsifier l’IP ne permet pas d’essayer des codes à l’infini', async () => {
    const { demarrer: d } = await import('./aide.js');
    const t2 = await d();
    let dernier;
    for (let i = 0; i < 205; i++) {
      dernier = await t2.agent().post('/api/entree').set('X-Atelier', '1').set('CF-Connecting-IP', `10.0.${i >> 8}.${i & 255}`).send({ code: 'AAAA-AAAA-AAAA' });
    }
    expect(dernier.status).toBe(429);
    await t2.fermer();
  });
});

describe('Historique, notes, quiz et badges', () => {
  it('versions : copie à la connexion, restauration poussée en direct, ancienne version gardée', async () => {
    const m = await t.mentor();
    const e = await t.nouvelEleve(m, 'histo');
    const a = await t.connecterEleve(e.code);
    await a.put('/api/eleve/projet').set('X-Atelier', '1').send({ html: '<h1>Version 1</h1>', css: '', js: '' }).expect(200);
    const se = t.socket('/eleve', a);
    await attendreEvt(se, 'connect');
    await new Promise((r) => setTimeout(r, 50));
    let versions = (await m.get(`/api/mentor/eleves/${e.id}/versions`).expect(200)).body;
    expect(versions.map((v) => v.raison)).toEqual(['seance']);
    const v1 = versions[0].id;

    await a.put('/api/eleve/projet').set('X-Atelier', '1').send({ html: '<h1>Tout cassé</h1>', css: '', js: '' }).expect(200);
    const remplace = attendreEvt(se, 'code:remplacer');
    await m.post(`/api/mentor/eleves/${e.id}/versions/${v1}/restauration`).set('X-Atelier', '1').expect(200);
    expect((await remplace).code.html).toBe('<h1>Version 1</h1>');
    versions = (await m.get(`/api/mentor/eleves/${e.id}/versions`).expect(200)).body;
    expect(versions[0].raison).toBe('avant-restauration');
    expect((await m.get(`/api/mentor/eleves/${e.id}/versions/${versions[0].id}`).expect(200)).body.html).toBe('<h1>Tout cassé</h1>');
    await m.post(`/api/mentor/eleves/${e.id}/versions/abc/restauration`).set('X-Atelier', '1').expect(404);
    // Un élève ne peut pas lire les versions d'un autre (routes mentor uniquement)
    await a.get(`/api/mentor/eleves/${e.id}/versions`).expect(401);
    se.disconnect();
  });

  it('notes privées : réservées au mentor, taille limitée', async () => {
    const m = await t.mentor();
    const e = await t.nouvelEleve(m, 'notes');
    await m.put(`/api/mentor/eleves/${e.id}/notes`).set('X-Atelier', '1').send({ texte: 'Revoir padding / margin' }).expect(200);
    expect((await m.get(`/api/mentor/eleves/${e.id}/notes`).expect(200)).body.texte).toBe('Revoir padding / margin');
    await m.put(`/api/mentor/eleves/${e.id}/notes`).set('X-Atelier', '1').send({ texte: 'x'.repeat(20001) }).expect(400);
    const a = await t.connecterEleve(e.code);
    const etat = (await a.get('/api/eleve/etat').expect(200)).body;
    expect(JSON.stringify(etat)).not.toContain('padding / margin');
  });

  it('quiz : réponses jamais envoyées avant, correction côté serveur, une seule fois', async () => {
    const m = await t.mentor();
    const e = await t.nouvelEleve(m, 'quiz');
    const a = await t.connecterEleve(e.code);
    const se = t.socket('/eleve', a);
    await attendreEvt(se, 'connect');
    expect(await emettre(se, 'quiz:demander')).toBeNull(); // aucune mission réussie
    for (const id of ['html-1', 'html-2', 'html-3']) expect((await emettre(se, 'mission:reussie', id)).ok).toBe(true);
    const quiz = await emettre(se, 'quiz:demander');
    expect(quiz.questions).toHaveLength(3);
    expect(JSON.stringify(quiz)).not.toMatch(/bonne|reponse|explication/);
    expect(await emettre(se, 'quiz:demander')).toBeNull(); // pas deux fois de suite
    const resultat = await emettre(se, 'quiz:repondre', { id: quiz.id, reponses: [0, 0, 0] });
    expect(resultat.total).toBe(3);
    expect(resultat.corrections[0]).toHaveProperty('bonne');
    expect(await emettre(se, 'quiz:repondre', { id: quiz.id, reponses: [0, 0, 0] })).toBeNull();
    // Le mentor peut relancer un quiz quand il veut
    const lance = attendreEvt(se, 'quiz:lancer');
    await m.post(`/api/mentor/eleves/${e.id}/quiz`).set('X-Atelier', '1').expect(200);
    expect((await lance).questions).toHaveLength(3);
    se.disconnect();
  });

  it('badges : attribués par le serveur, l’élève ne peut s’en donner que deux « d’exploration »', async () => {
    const m = await t.mentor();
    const e = await t.nouvelEleve(m, 'badges');
    const a = await t.connecterEleve(e.code);
    const se = t.socket('/eleve', a);
    await attendreEvt(se, 'connect');
    const r = await emettre(se, 'mission:reussie', 'html-1');
    expect(r.badges.map((b) => b.id)).toEqual(['premier-pas']);
    const nouveaux = attendreEvt(se, 'badges:nouveaux');
    se.emit('badge:evenement', 'legende'); // interdit : ignoré
    se.emit('badge:evenement', 'explorateur');
    expect((await nouveaux).map((b) => b.id)).toEqual(['explorateur']);
    const badges = (await a.get('/api/eleve/etat').expect(200)).body.badges.map((b) => b.badge);
    expect(badges.sort()).toEqual(['explorateur', 'premier-pas']);
    se.disconnect();
  });
});

describe('Site publié : visites, vitrine, zip', () => {
  it('compte les visites sans doublon, sans robots, sans l’élève ni le mentor', async () => {
    const m = await t.mentor();
    const e = await t.nouvelEleve(m, 'visites');
    const a = await t.connecterEleve(e.code);
    await m.post(`/api/mentor/eleves/${e.id}/publication`).set('X-Atelier', '1').expect(200);
    const visiter = (ip, ua = 'Mozilla/5.0 Firefox', extra = {}) => t.agent().get('/site/visites').set({ 'CF-Connecting-IP': ip, 'User-Agent': ua, ...extra }).expect(200);
    await visiter('1.1.1.1');
    await visiter('1.1.1.1'); // même visiteur le même jour
    await visiter('2.2.2.2');
    await visiter('3.3.3.3', 'Discordbot/2.0'); // aperçu de lien
    await visiter('4.4.4.4', 'Mozilla/5.0', { 'Sec-Fetch-Dest': 'iframe' }); // miniature
    await a.get('/site/visites').set('CF-Connecting-IP', '5.5.5.5').expect(200); // l'élève lui-même
    await m.get('/site/visites').set('CF-Connecting-IP', '6.6.6.6').expect(200); // le mentor
    expect((await a.get('/api/eleve/etat').expect(200)).body.visites).toBe(2);
    expect(t.appli.bdd.db.prepare("SELECT sql FROM sqlite_master WHERE sql LIKE '%ip%' AND name NOT LIKE 'sqlite%'").all().filter((r) => /\bip\b/i.test(r.sql))).toHaveLength(0);
  });

  it('vitrine : seulement les sites cochés, jamais indexée', async () => {
    const m = await t.mentor();
    const e = await t.nouvelEleve(m, 'vitrine');
    await m.post(`/api/mentor/eleves/${e.id}/publication`).set('X-Atelier', '1').expect(200);
    let r = await t.agent().get('/vitrine').expect(200);
    expect(r.text).not.toContain('/site/vitrine');
    expect(r.headers['x-robots-tag']).toMatch(/noindex/);
    await m.put(`/api/mentor/eleves/${e.id}/vitrine`).set('X-Atelier', '1').send({ visible: true }).expect(200);
    r = await t.agent().get('/vitrine').expect(200);
    expect(r.text).toContain('/site/vitrine');
    expect(r.text).toMatch(/<iframe src="\/site\/vitrine" sandbox=""/);
    await m.put(`/api/mentor/eleves/${e.id}/vitrine`).set('X-Atelier', '1').send({ visible: 'oui' }).expect(400);
  });

  it('zip : contient index.html qui appelle seulement les fichiers débloqués', async () => {
    const m = await t.mentor();
    const e = await t.nouvelEleve(m, 'zip');
    const a = await t.connecterEleve(e.code);
    await a.put('/api/eleve/projet').set('X-Atelier', '1').send({ html: '<h1>Mon site</h1>', css: 'h1{}', js: 'secret()' }).expect(200);
    const r = await a.get('/api/eleve/site.zip').buffer(true).parse((res, cb) => {
      const morceaux = [];
      res.on('data', (c) => morceaux.push(c));
      res.on('end', () => cb(null, Buffer.concat(morceaux)));
    }).expect(200);
    expect(r.headers['content-disposition']).toBe('attachment; filename="site-zip.zip"');
    const contenu = r.body;
    expect(contenu.subarray(0, 4).toString('hex')).toBe('504b0304'); // signature ZIP
    expect(contenu.includes(Buffer.from('site-zip/index.html'))).toBe(true);
    expect(contenu.includes(Buffer.from('site-zip/script.js'))).toBe(false); // JS pas encore débloqué
    await t.agent().get('/api/eleve/site.zip').expect(401);
  });
});
