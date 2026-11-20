// Mini-client WebDriver BiDi pour piloter le Firefox installé sur la machine (mode sans fenêtre).
// Aucun navigateur n'est téléchargé : on utilise celui qui est déjà là.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export async function lancerFirefox({ binaire = process.env.FIREFOX || 'firefox', largeur = 1440, hauteur = 900 } = {}) {
  // Firefox installé en « snap » n'a accès qu'à certains dossiers du dossier personnel.
  const base = path.join(os.homedir(), 'snap', 'firefox', 'common');
  let dossier;
  try {
    mkdirSync(base, { recursive: true });
    dossier = mkdtempSync(path.join(base, 'atelier-test-'));
  } catch {
    dossier = mkdtempSync(path.join(os.tmpdir(), 'atelier-test-'));
  }
  const port = 9300 + Math.floor(Math.random() * 500);
  const processus = spawn(binaire, ['--headless', '--no-remote', '--profile', dossier, '--remote-debugging-port', String(port), 'about:blank'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const url = await new Promise((ok, ko) => {
    const minuterie = setTimeout(() => ko(new Error('Firefox ne répond pas')), 30000);
    const lire = (d) => {
      const m = /WebDriver BiDi listening on (ws:\/\/\S+)/.exec(String(d));
      if (m) {
        clearTimeout(minuterie);
        ok(m[1]);
      }
    };
    processus.stdout.on('data', lire);
    processus.stderr.on('data', lire);
    processus.on('exit', () => ko(new Error('Firefox s’est arrêté')));
  });

  const ws = new WebSocket(`${url}/session`);
  await new Promise((ok, ko) => {
    ws.onopen = ok;
    ws.onerror = ko;
  });
  let id = 0;
  const attente = new Map();
  const ecouteurs = [];
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && attente.has(msg.id)) {
      const { ok, ko } = attente.get(msg.id);
      attente.delete(msg.id);
      if (msg.type === 'error') ko(new Error(`${msg.error}: ${msg.message}`));
      else ok(msg.result);
    } else if (msg.type === 'event') {
      for (const f of ecouteurs) f(msg);
    }
  };
  const envoyer = (method, params = {}) =>
    new Promise((ok, ko) => {
      const n = ++id;
      attente.set(n, { ok, ko });
      ws.send(JSON.stringify({ id: n, method, params }));
    });

  await envoyer('session.new', { capabilities: {} });
  const arbre = await envoyer('browsingContext.getTree', {});
  const contexte = arbre.contexts[0].context;
  await envoyer('browsingContext.setViewport', { context: contexte, viewport: { width: largeur, height: hauteur } });

  // Journal de la page (erreurs JS de l'application)
  const journal = [];
  await envoyer('session.subscribe', { events: ['log.entryAdded'] });
  ecouteurs.push((m) => m.method === 'log.entryAdded' && journal.push(m.params));

  const nav = {
    journal,
    envoyer,
    async aller(adresse) {
      return envoyer('browsingContext.navigate', { context: contexte, url: adresse, wait: 'complete' });
    },
    async evaluer(expression) {
      const r = await envoyer('script.evaluate', { expression, target: { context: contexte }, awaitPromise: true, resultOwnership: 'none' });
      if (r.type === 'exception') throw new Error(`Exception dans la page : ${r.exceptionDetails.text}`);
      return deserialiser(r.result);
    },
    async attendre(expression, { delai = 10000, message } = {}) {
      const fin = Date.now() + delai;
      let derniere;
      while (Date.now() < fin) {
        try {
          derniere = await nav.evaluer(expression);
          if (derniere) return derniere;
        } catch (e) {
          derniere = e.message;
        }
        await new Promise((ok) => setTimeout(ok, 100));
      }
      throw new Error(`Délai dépassé : ${message || expression} (dernière valeur : ${JSON.stringify(derniere)})`);
    },
    async taper(texte) {
      const actions = [];
      for (const c of texte) {
        const v = c === '\n' ? '' : c;
        actions.push({ type: 'keyDown', value: v }, { type: 'keyUp', value: v });
      }
      await envoyer('input.performActions', { context: contexte, actions: [{ type: 'key', id: 'clavier', actions }] });
      await envoyer('input.releaseActions', { context: contexte });
    },
    async taille(largeur, hauteur, densite = 1) {
      await envoyer('browsingContext.setViewport', { context: contexte, viewport: { width: largeur, height: hauteur }, devicePixelRatio: densite });
    },
    async touches(...valeurs) {
      const actions = [...valeurs.map((v) => ({ type: 'keyDown', value: v })), ...valeurs.reverse().map((v) => ({ type: 'keyUp', value: v }))];
      await envoyer('input.performActions', { context: contexte, actions: [{ type: 'key', id: 'clavier', actions }] });
      await envoyer('input.releaseActions', { context: contexte });
    },
    async capture(fichier, { pleinePage = false, zone } = {}) {
      const { writeFileSync } = await import('node:fs');
      const params = { context: contexte, origin: pleinePage ? 'document' : 'viewport' };
      if (zone) params.clip = { type: 'box', ...zone };
      const r = await envoyer('browsingContext.captureScreenshot', params);
      writeFileSync(fichier, Buffer.from(r.data, 'base64'));
    },
    async fermer() {
      try {
        await envoyer('session.end', {});
      } catch {
        /* rien */
      }
      ws.close();
      processus.kill();
      await new Promise((ok) => setTimeout(ok, 300));
      rmSync(dossier, { recursive: true, force: true });
    },
  };
  return nav;
}

function deserialiser(v) {
  if (!v) return v;
  switch (v.type) {
    case 'undefined':
    case 'null':
      return null;
    case 'string':
    case 'number':
    case 'boolean':
      return v.value;
    case 'array':
      return v.value.map(deserialiser);
    case 'object':
      if (!Array.isArray(v.value)) return `[${v.type}]`;
      return Object.fromEntries(v.value.map(([k, val]) => [typeof k === 'string' ? k : deserialiser(k), deserialiser(val)]));
    default:
      return v.value ?? `[${v.type}]`;
  }
}
