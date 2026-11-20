// Tests dans un vrai navigateur (Firefox installé, sans fenêtre).
//   npm run build && npm run test:navigateur
// 1. Les 19 missions : la solution de référence réussit, l'étape d'avant échoue, les pièges échouent.
// 2. Parcours de l'élève : premier titre → mission réussie, erreurs JS en français, isolation de l'aperçu.
// 3. Le mentor voit le code en direct et envoie un message.
import http from 'node:http';
import { readFileSync, mkdtempSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { io as ioClient } from 'socket.io-client';
import { lancerFirefox } from './bidi.js';
import { ETAPES, PIEGES } from './solutions.js';
import { assemblerPage } from '../../partage/regles.js';
import { protegerBoucles } from '../../partage/garde-boucles.js';
import { chargerConfig } from '../../serveur/config.js';
import { creerApplication } from '../../serveur/app.js';
import { RACINE } from '../../serveur/config.js';

const CAPTURES = path.join(RACINE, 'tests', 'navigateur', 'captures');
mkdirSync(CAPTURES, { recursive: true });
let echecs = 0;
const ok = (condition, texte) => {
  console.log(`${condition ? '  ✅' : '  ❌'} ${texte}`);
  if (!condition) echecs++;
};

if (!existsSync(path.join(RACINE, 'dist', 'index.html'))) {
  console.error('Lance d’abord « npm run build ».');
  process.exit(1);
}

// --- Serveur de l'Atelier (base temporaire) -----------------------------------
process.env.ATELIER_SANS_DOTENV = '1';
const dossierDonnees = mkdtempSync(path.join(os.tmpdir(), 'atelier-donnees-'));
const MDP = 'mentor-test-123';
const config = chargerConfig({ MENTOR_PASSWORD: MDP, SESSION_SECRET: 's'.repeat(40), DATA_DIR: dossierDonnees, PUBLIC_URL: 'http://127.0.0.1:3999', COOKIE_SECURE: 'false', PORT: '3999' });
const appli = await creerApplication(config);
await new Promise((r) => appli.serveur.listen(3999, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:3999';

// --- Banc d'essai des missions (page de test minimale) ---------------------------
const sonde = readFileSync(path.join(RACINE, 'client', 'src', 'commun', 'sonde.js'), 'utf8');
const catalogue = appli.catalogue.public;
const mission = (id) => catalogue.missions.find((m) => m.id === id);
const pageBanc = (code) =>
  assemblerPage({ ...code, js: protegerBoucles(code.js || '') }, { onglets: ['html', 'css', 'js'], enTete: `<script data-role="banc">\n${sonde}\n</script>` });

const cas = [];
ETAPES.forEach((etape, i) => {
  if (!etape.mission) return;
  const m = mission(etape.mission);
  cas.push({ nom: `${m.id} réussie avec la solution`, attendu: true, page: pageBanc(etape), verifications: m.verifications, source: etape });
  const avant = ETAPES[i - 1];
  cas.push({ nom: `${m.id} pas encore réussie à l’étape d’avant`, attendu: false, page: pageBanc(avant), verifications: m.verifications, source: avant });
});
for (const p of PIEGES) {
  const code = { html: p.html, css: p.css || '', js: p.js || '' };
  cas.push({ nom: `${p.mission} : piège « ${p.pourquoi} »`, attendu: p.attendu ?? false, page: pageBanc(code), verifications: mission(p.mission).verifications, source: code });
}

const harnais = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
<script>
const CAS = ${JSON.stringify(cas).replace(/</g, '\\u003c')};
window.__resultats = null;
(async () => {
  const sorties = [];
  for (const c of CAS) {
    const cadre = document.createElement('iframe');
    cadre.setAttribute('sandbox', 'allow-scripts');
    cadre.style.cssText = 'position:fixed;left:-20000px;width:1280px;height:800px;border:0';
    const res = await new Promise((fini) => {
      const ecoute = (e) => {
        if (e.source !== cadre.contentWindow || !e.data || !e.data.atelier) return;
        if (e.data.type === 'pret') cadre.contentWindow.postMessage({ atelier: true, type: 'verifier', id: 'x', verifications: c.verifications, source: c.source }, '*');
        if (e.data.type === 'resultats') { removeEventListener('message', ecoute); fini(e.data.resultats); }
      };
      addEventListener('message', ecoute);
      setTimeout(() => fini(null), 10000);
      document.body.append(cadre);
      cadre.srcdoc = c.page;
    });
    cadre.remove();
    sorties.push(res);
  }
  window.__resultats = sorties;
})();
</script></body></html>`;
const serveurHarnais = http.createServer((req, res) => res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(harnais));
await new Promise((r) => serveurHarnais.listen(3998, '127.0.0.1', r));

const nav = await lancerFirefox();
try {
  console.log('\n🧪 1. Les missions (solutions de référence et pièges)');
  await nav.aller('http://127.0.0.1:3998/');
  const resultats = await nav.attendre('window.__resultats', { delai: 120000 });
  cas.forEach((c, i) => {
    const r = resultats[i];
    const reussi = Array.isArray(r) && r.every(Boolean);
    const detail = Array.isArray(r) ? r.map((x) => (x ? '✓' : '·')).join('') : 'pas de réponse';
    ok(reussi === c.attendu, `${c.nom} [${detail}]`);
  });

  // ------------------------------------------------------------------------------
  console.log('\n🧪 2. Parcours de l’élève');
  const { code, eleve } = appli.bdd.creerEleve('alex');
  const debut = Date.now();
  await nav.aller(`${BASE}/e/${code}`);
  ok(await nav.evaluer('location.pathname') === '/', 'le lien personnel ouvre l’atelier (et le code disparaît de l’URL)');
  await nav.attendre("document.querySelector('.cm-content')", { message: 'éditeur affiché' });
  await nav.attendre("document.querySelector('#checklist li')", { message: 'mission affichée' });
  ok((await nav.evaluer("document.querySelector('.titre-mission').textContent")) === 'Ton tout premier titre', 'la mission 1 est affichée');
  ok((await nav.evaluer("document.activeElement.classList.contains('cm-content')")) === true, 'le curseur est déjà dans l’éditeur');
  await nav.capture(path.join(CAPTURES, '1-accueil.png'));

  await nav.taper('<h1>Le repaire des gamers');
  await nav.attendre("document.querySelector('.victoire')", { message: 'célébration de la mission 1' });
  ok(true, `mission 1 réussie en ${((Date.now() - debut) / 1000).toFixed(1)} s après l’ouverture du lien`);
  ok(/<h1>Le repaire des gamers<\/h1>/.test(await nav.evaluer("document.querySelector('#editeur-html .cm-content').textContent")), 'la balise fermante </h1> a été ajoutée automatiquement');
  await new Promise((r) => setTimeout(r, 500));
  await nav.capture(path.join(CAPTURES, '2-mission-reussie.png'));
  ok((await nav.evaluer("document.querySelector('.cadre-apercu iframe').getAttribute('sandbox')")) === 'allow-scripts', 'aperçu : sandbox="allow-scripts" uniquement');

  await nav.evaluer("document.querySelector('.victoire .bouton-principal').click()");
  await nav.attendre("document.querySelector('.titre-mission').textContent === 'Présente ton site'", { message: 'passage à la mission 2' });
  ok(true, 'le bouton « Mission suivante » ouvre la mission 2');

  // Le mentor ouvre le JavaScript (via l'API, comme dans le panneau mentor)
  const r = await fetch(`${BASE}/api/mentor/connexion`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Atelier': '1' }, body: JSON.stringify({ motDePasse: MDP }) });
  const cookieMentor = r.headers.get('set-cookie').split(';')[0];
  const mentorApi = (methode, url, corps) => fetch(`${BASE}${url}`, { method: methode, headers: { 'Content-Type': 'application/json', 'X-Atelier': '1', cookie: cookieMentor }, body: corps && JSON.stringify(corps) });

  const sm = ioClient(`${BASE}/mentor`, { transports: ['websocket'], extraHeaders: { cookie: cookieMentor } });
  await new Promise((r2) => sm.on('connect', r2));
  const suivi = await new Promise((r2) => sm.emit('suivre', eleve.id, r2));
  ok(suivi.ok && suivi.fiche.enLigne, 'le mentor voit l’élève en ligne');
  const codesRecus = [];
  sm.on('eleve:code', (c) => codesRecus.push(c));

  await mentorApi('PUT', `/api/mentor/eleves/${eleve.id}/deblocages`, { cible: 'module:js', etat: 'ouvert' });
  await nav.attendre("document.querySelector('#onglet-js')", { message: 'onglet JS apparu sans recharger' });
  ok(true, 'l’onglet JS apparaît dès que le mentor le débloque');

  await nav.evaluer("document.querySelector('#onglet-js').click()");
  await nav.taper('bouton.addEventListener("click", f);\nconsole.log(document.cookie);\nconsole.log(parent.document.title);');
  await nav.attendre("document.querySelector('.erreur-expliquee')", { message: 'erreur affichée' });
  const erreur = await nav.evaluer("document.querySelector('.erreur-expliquee').textContent");
  ok(/Je ne connais pas « bouton »/.test(erreur) && /ligne 3 de ton JS/.test(erreur), `erreur expliquée en français : « ${erreur.slice(0, 70)}… »`);
  await nav.capture(path.join(CAPTURES, '3-erreur-js.png'));

  // Isolation : le JS de l'élève ne peut ni lire les cookies ni toucher l'application
  await nav.touches('', 'a'); // Ctrl+A
  await nav.taper('try { console.log("cookie:" + document.cookie); } catch (e) { console.log("cookie bloqué"); }\ntry { console.log("parent:" + parent.document.title); } catch (e) { console.log("parent bloqué"); }\nfetch("/api/eleve/etat").then((r) => console.log("api:" + r.status), () => console.log("api bloquée"));');
  await nav.attendre("document.querySelector('#lignes-console').textContent.includes('api')", { message: 'tests d’isolation exécutés' });
  const consoleTexte = await nav.evaluer("document.querySelector('#lignes-console').textContent");
  ok(consoleTexte.includes('cookie bloqué'), 'aperçu : document.cookie est inaccessible');
  ok(consoleTexte.includes('parent bloqué'), 'aperçu : impossible de toucher à l’application (parent.document)');
  ok(consoleTexte.includes('api bloquée') || !consoleTexte.includes('api:200'), 'aperçu : impossible d’appeler l’API avec la session de l’élève');

  // Boucle infinie : l'onglet ne gèle pas
  await nav.touches('', 'a');
  await nav.taper('let i = 0;\nwhile (true) { i++; }\nconsole.log("après la boucle");');
  await nav.attendre("document.querySelector('#lignes-console').textContent.includes('Boucle infinie')", { delai: 8000, message: 'boucle infinie arrêtée' });
  ok(true, 'une boucle infinie est arrêtée et expliquée (l’onglet ne gèle pas)');

  await new Promise((r2) => setTimeout(r2, 600));
  ok(codesRecus.length > 0 && codesRecus.at(-1).js.includes('while (true)'), `le mentor reçoit le code en direct (${codesRecus.length} mises à jour)`);

  await mentorApi('POST', `/api/mentor/eleves/${eleve.id}/messages`, { type: 'indice', texte: 'Regarde la ligne 2 😉' });
  await nav.attendre("[...document.querySelectorAll('.notif')].some(n => n.textContent.includes('Regarde la ligne 2'))", { message: 'notification du mentor' });
  ok(true, 'le message du mentor s’affiche chez l’élève');
  await nav.capture(path.join(CAPTURES, '4-message-mentor.png'));

  // Sauvegarde : le code est retrouvé après rechargement
  await new Promise((r2) => setTimeout(r2, 1800));
  await nav.aller(`${BASE}/`);
  await nav.attendre("document.querySelector('#editeur-js .cm-content')");
  const apres = await nav.evaluer("document.querySelector('#editeur-js .cm-content').textContent");
  ok(apres.includes('après la boucle'), 'le code est retrouvé après rechargement de la page');

  // Bac à sable + mémo, sur un écran de portable (1366×768, typique d'un partage Meet)
  await nav.envoyer('browsingContext.setViewport', { context: (await nav.envoyer('browsingContext.getTree', {})).contexts[0].context, viewport: { width: 1366, height: 768 } });
  await nav.evaluer("document.querySelector('[data-mode=libre]').click()");
  await nav.attendre("!document.querySelector('#panneau-memo').hidden && document.querySelector('.entree-memo')", { message: 'mémo affiché en bac à sable' });
  const termes = await nav.evaluer("[...document.querySelectorAll('.entree-memo .terme')].map(t => t.textContent)");
  ok(termes.includes('<h1>') && termes.includes('console.log()') && !termes.includes('background-color'), `le mémo ne montre que ce qui est débloqué (${termes.length} entrées, pas de CSS)`);
  await nav.evaluer("document.querySelector('.entree-memo').open = true");
  await nav.capture(path.join(CAPTURES, '7-bac-a-sable-1366.png'));
  await nav.evaluer("document.querySelector('[data-mode=missions]').click()");
  await nav.evaluer("document.querySelector('[data-panneau=parcours]').click()");
  await nav.capture(path.join(CAPTURES, '8-parcours-1366.png'));
  await nav.envoyer('browsingContext.setViewport', { context: (await nav.envoyer('browsingContext.getTree', {})).contexts[0].context, viewport: { width: 1440, height: 900 } });
  sm.close();

  // ------------------------------------------------------------------------------
  console.log('\n🧪 3. Panneau mentor');
  await nav.aller(`${BASE}/mentor`);
  await nav.attendre("document.querySelector('#mdp')", { message: 'écran de connexion mentor' });
  await nav.taper(MDP + '\n');
  await nav.attendre("document.querySelector('.liste-eleves .eleve')", { message: 'liste des élèves' });
  ok((await nav.evaluer("document.querySelector('.liste-eleves').textContent")).includes('alex'), 'connexion mentor et liste des élèves');
  await nav.evaluer("document.querySelector('.liste-eleves .eleve').click()");
  await nav.attendre("document.querySelector('.grille-direct .cm-content')", { message: 'vue en direct' });
  await nav.evaluer("[...document.querySelectorAll('.grille-direct .onglet-code')].find(b => b.textContent.includes('script.js')).click()");
  await nav.attendre("[...document.querySelectorAll('.grille-direct .cm-content')].some(c => c.textContent.includes('après la boucle'))", { message: 'code de l’élève visible' });
  ok(true, 'le mentor voit le code de l’élève dans la vue en direct');
  await nav.attendre("document.querySelector('#infos-direct').textContent.includes('Présente ton site')", { message: 'mission en cours affichée' });
  ok(true, 'la mission en cours est affichée côté mentor');
  await nav.attendre("document.querySelector('.info-checklist li')", { message: 'checklist de la mission côté mentor' });
  ok(true, 'le mentor voit la checklist de la mission en cours');
  await nav.capture(path.join(CAPTURES, '5-mentor-direct.png'));

  await nav.evaluer("[...document.querySelectorAll('.onglets-fiche button')].find(b => b.textContent.includes('Parcours')).click()");
  await nav.attendre("document.querySelector('.carte-module.module-css input[type=checkbox]')");
  await nav.evaluer("document.querySelector('.carte-module.module-css input[type=checkbox]').click()");
  await nav.attendre("document.querySelector('.carte-module.module-css input[type=checkbox]').checked && document.querySelector('.carte-module.module-css').textContent.includes('disponible')", { message: 'module CSS ouvert' });
  ok(true, 'le mentor ouvre le module CSS depuis l’interface');
  await nav.capture(path.join(CAPTURES, '6-mentor-parcours.png'));

  await nav.evaluer("[...document.querySelectorAll('.onglets-fiche button')].find(b => b.textContent.includes('Publication')).click()");
  await nav.attendre("document.querySelector('.carte-publication .bouton-principal')");
  await nav.evaluer("document.querySelector('.carte-publication .bouton-principal').click()");
  await nav.attendre("document.querySelector('.statut-pub.en-ligne')", { message: 'site publié' });
  ok(true, 'le mentor publie le site');
  const pub = await fetch(`${BASE}/site/alex`);
  ok(pub.status === 200 && /^sandbox allow-scripts/.test(pub.headers.get('content-security-policy')), 'le site publié est servi en sandbox (CSP)');
  await nav.aller(`${BASE}/site/alex`);
  const cookieVisible = await nav.evaluer('(() => { try { return document.cookie; } catch (e) { return "BLOQUÉ"; } })()');
  ok(cookieVisible === 'BLOQUÉ' || cookieVisible === '', 'le JS du site publié ne peut pas lire les cookies du mentor');
  ok((await nav.evaluer("document.querySelector('h1').textContent")) === 'Le repaire des gamers', 'le site publié affiche la page de l’élève');

  const erreursApp = nav.journal.filter((j) => j.level === 'error' && !/about:srcdoc/.test(j.source?.context || '') && !/atelier|bouton|cookie|parent|Boucle|Cross-Origin Request Blocked/i.test(j.text));
  ok(erreursApp.length === 0, `aucune erreur JS dans l’application elle-même${erreursApp.length ? ' : ' + erreursApp.map((e) => e.text).join(' | ') : ''}`);
} catch (e) {
  echecs++;
  console.error('  💥', e.message);
  await nav.capture(path.join(CAPTURES, 'erreur.png')).catch(() => {});
} finally {
  await nav.fermer();
  serveurHarnais.close();
  appli.temps.io.close();
  rmSync(dossierDonnees, { recursive: true, force: true });
}

console.log(echecs ? `\n❌ ${echecs} échec(s)` : '\n✅ Tous les tests navigateur passent');
process.exit(echecs ? 1 : 0);
