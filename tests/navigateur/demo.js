// Captures de démonstration :  npm run build && npm run captures
//  - client/public/images/apercu-atelier.png : l'illustration de la page d'accueil
//  - tests/navigateur/captures/site-*.png    : toutes les pages publiques (ordinateur et téléphone)
// Les élèves et leurs sites sont fictifs, créés dans une base temporaire.
import { mkdtempSync, rmSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { lancerFirefox } from './bidi.js';
import { chargerConfig, RACINE } from '../../serveur/config.js';
import { creerApplication } from '../../serveur/app.js';

if (!existsSync(path.join(RACINE, 'dist', 'index.html'))) {
  console.error('Lance d’abord « npm run build ».');
  process.exit(1);
}
process.env.ATELIER_SANS_DOTENV = '1';
const CAPTURES = path.join(RACINE, 'tests', 'navigateur', 'captures');
const IMAGE_ACCUEIL = path.join(RACINE, 'client', 'public', 'images', 'apercu-atelier.png');
mkdirSync(CAPTURES, { recursive: true });
mkdirSync(path.dirname(IMAGE_ACCUEIL), { recursive: true });

const dossier = mkdtempSync(path.join(os.tmpdir(), 'atelier-demo-'));
const config = chargerConfig({
  MENTOR_PASSWORD: 'demo-demo-demo',
  SESSION_SECRET: 'd'.repeat(40),
  DATA_DIR: path.join(dossier, 'donnees'),
  SAUVEGARDE_DOSSIER: path.join(dossier, 'sauvegardes'),
  PUBLIC_URL: 'https://latelier.juleslfl.dev',
  COOKIE_SECURE: 'false',
});
const appli = await creerApplication(config, { sauvegardesAuto: false });
await new Promise((r) => appli.serveur.listen(3997, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:3997';
const { bdd, service } = appli;

// --- Trois sites d'élèves fictifs ------------------------------------------------
const SITES = {
  nova: {
    html: `<header>\n  <h1>🎮 Le repaire des gamers</h1>\n  <p>Mes jeux préférés, mes astuces et mes records.</p>\n</header>\n\n<main>\n  <section class="carte">\n    <h2>Mon top 3</h2>\n    <ul>\n      <li>Minecraft</li>\n      <li>Rocket League</li>\n      <li>Celeste</li>\n    </ul>\n  </section>\n\n  <section class="carte">\n    <h2>Astuce du jour</h2>\n    <p>Dans Celeste, maintiens le saut pour aller <strong>plus haut</strong>.</p>\n  </section>\n</main>`,
    css: `body {\n  background-color: #1e1b4b;\n  color: white;\n  font-family: Verdana, sans-serif;\n}\n\nh1 {\n  color: gold;\n  font-size: 2.6rem;\n}\n\n.carte {\n  background-color: #312e81;\n  padding: 20px;\n  margin-bottom: 16px;\n}\n`,
    js: '',
  },
  lea: {
    html: `<header>\n  <h1>⚽ Allez les Bleues !</h1>\n  <p>Le site de l’équipe U15 du club</p>\n</header>\n<main>\n  <section class="carte">\n    <h2>Prochain match</h2>\n    <p>Samedi, 14 h, au stade municipal.</p>\n  </section>\n  <section class="carte">\n    <h2>Le classement</h2>\n    <table>\n      <tr><th>Équipe</th><th>Points</th></tr>\n      <tr><td>Les Bleues</td><td>24</td></tr>\n      <tr><td>Les Aigles</td><td>21</td></tr>\n    </table>\n  </section>\n  <button id="like">💙 Supporter · <span id="n">0</span></button>\n</main>`,
    css: `body {\n  margin: 0;\n  font-family: Arial, sans-serif;\n  background: linear-gradient(160deg, #0c4a6e, #0284c7);\n  color: white;\n  text-align: center;\n}\nheader { padding: 40px 16px 10px; }\nh1 { font-size: 3rem; margin: 0; }\nmain { max-width: 700px; margin: 0 auto; padding: 16px; }\n.carte {\n  background: rgba(255, 255, 255, 0.15);\n  border-radius: 18px;\n  padding: 16px;\n  margin-bottom: 16px;\n  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);\n}\ntable { margin: 0 auto; border-collapse: collapse; }\ntd, th { padding: 6px 16px; }\nbutton {\n  font-size: 1.2rem;\n  border: 0;\n  border-radius: 999px;\n  padding: 10px 22px;\n  background: white;\n  color: #0369a1;\n}`,
    js: `let n = 0;\ndocument.querySelector("#like").addEventListener("click", function () {\n  n = n + 1;\n  document.querySelector("#n").textContent = n;\n});`,
  },
  sam: {
    html: `<header>\n  <h1>🎧 Sam’s Playlist</h1>\n  <p>Les sons qui tournent en boucle dans mon casque.</p>\n</header>\n<main class="galerie">\n  <div class="carte"><h2>🔥 Rap</h2><p>Pour se motiver avant un contrôle.</p></div>\n  <div class="carte"><h2>🌙 Lo-fi</h2><p>Pour faire ses devoirs tranquille.</p></div>\n  <div class="carte"><h2>🎸 Rock</h2><p>Pour le trajet du matin.</p></div>\n</main>\n<footer><p>Fait avec ❤️ à L’Atelier</p></footer>`,
    css: `body {\n  margin: 0;\n  font-family: 'Trebuchet MS', sans-serif;\n  background: #111;\n  color: #fafafa;\n}\nheader {\n  padding: 48px 24px;\n  background: linear-gradient(135deg, #db2777, #f59e0b);\n}\nh1 { margin: 0; font-size: 3rem; }\n.galerie {\n  display: flex;\n  gap: 16px;\n  flex-wrap: wrap;\n  padding: 24px;\n}\n.carte {\n  flex: 1;\n  min-width: 180px;\n  background: #222;\n  border-radius: 16px;\n  padding: 16px;\n  border: 2px solid #db2777;\n  transition: transform 0.3s;\n}\n.carte:hover { transform: rotate(-2deg) scale(1.03); }\nfooter { text-align: center; color: #888; }`,
    js: '',
  },
};

const eleves = {};
for (const [pseudo, code] of Object.entries(SITES)) {
  const { eleve, code: acces } = bdd.creerEleve(pseudo);
  eleves[pseudo] = { ...eleve, acces };
  bdd.majProjet(eleve.id, code);
  bdd.definirDeblocage(eleve.id, 'module:css', 'ouvert');
  const missions = appli.catalogue.missions.filter((m) => !m.bonus && (m.module === 'html' || (pseudo !== 'nova' && m.module !== 'html')));
  for (const m of missions) bdd.reussirMission(eleve.id, m.id, false);
  if (pseudo !== 'nova') {
    bdd.definirDeblocage(eleve.id, 'module:js', 'ouvert');
    bdd.definirAccords(eleve.id, { publication: Date.now(), vitrine: Date.now() });
    bdd.definirParentsInformes(eleve.id, Date.now());
    bdd.accepterCharte(eleve.id);
    bdd.publier(eleve.id, ['html', 'css', 'js']);
    bdd.definirVitrine(eleve.id, true);
  }
}
// nova : HTML fini, CSS en cours (missions 1 à 3 réussies, la 4e « Fais des cartes » en cours)
for (const id of ['css-1', 'css-2', 'css-3']) bdd.reussirMission(eleves.nova.id, id, false);
bdd.definirMissionCourante(eleves.nova.id, 'css-4');
bdd.noterQuizPropose(eleves.nova.id); // pas de quiz sur la capture
bdd.definirAccords(eleves.nova.id, { publication: Date.now(), vitrine: Date.now() });
bdd.definirParentsInformes(eleves.nova.id, Date.now());
bdd.accepterCharte(eleves.nova.id);
bdd.publier(eleves.nova.id, ['html', 'css']);
bdd.definirVitrine(eleves.nova.id, true);
service.attribuerBadges(eleves.nova.id); // badges déjà gagnés : pas de confettis sur les captures

const nav = await lancerFirefox({ largeur: 1440, hauteur: 900 });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const IMAGES = path.dirname(IMAGE_ACCUEIL);
const DIST_IMAGES = path.join(RACINE, 'dist', 'images');
mkdirSync(DIST_IMAGES, { recursive: true });
const garder = (nom) => {
  copyFileSync(path.join(IMAGES, nom), path.join(DIST_IMAGES, nom));
  console.log(`📸 client/public/images/${nom}`);
};
const rect = (selecteur) => nav.evaluer(`(() => { const r = document.querySelector(${JSON.stringify(selecteur)}).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`);

try {
  // 1. L'atelier, en haute définition (densité 2) pour des images nettes
  await nav.taille(1440, 900, 2);
  await nav.aller(`${BASE}/e/${eleves.nova.acces}`);
  await nav.attendre("document.querySelector('#onglet-css')");
  await nav.evaluer("document.querySelector('#onglet-css').click()");
  await nav.attendre("document.querySelectorAll('#checklist li.ok').length >= 2", { message: 'checklist' });
  await nav.evaluer("document.querySelectorAll('.notif').forEach(n => n.remove())");
  await pause(600);
  await nav.capture(IMAGE_ACCUEIL);
  garder('apercu-atelier.png');

  // Étape 1 : le haut de la mission (titre, objectif, explication)
  const panneau = await rect('.panneau-gauche');
  await nav.capture(path.join(IMAGES, 'etape-1-mission.png'), { zone: { x: panneau.x, y: panneau.y, width: 360, height: 380 } });
  garder('etape-1-mission.png');
  // Étape 2 : l'éditeur et l'aperçu en direct
  const editeur = await rect('.zone-editeur');
  await nav.capture(path.join(IMAGES, 'etape-2-direct.png'), { zone: { x: editeur.x, y: editeur.y, width: 900, height: 560 } });
  garder('etape-2-direct.png');
  // Étape 3 : « Mon site » (QR code)
  await nav.evaluer("document.querySelector('#bouton-mon-site').click()");
  await nav.attendre("document.querySelector('canvas.qr')");
  await pause(500);
  const modal = await rect('.modal');
  await nav.capture(path.join(IMAGES, 'etape-3-mon-site.png'), { zone: modal });
  console.log(`   (taille de l'étape 3 : ${Math.round(modal.width)}×${Math.round(modal.height)})`);
  garder('etape-3-mon-site.png');

  // 2. Image de partage (Open Graph) : le haut de l'accueil, thème clair, une fois l'animation finie
  await nav.evaluer("fetch('/api/sortie', { method: 'POST', headers: { 'X-Atelier': '1' } }).then(() => true)");
  await nav.taille(1200, 630, 1);
  await nav.aller(`${BASE}/`);
  await nav.evaluer("(localStorage.setItem('atelier:theme', 'clair'), true)");
  await nav.aller(`${BASE}/`);
  await nav.attendre("document.querySelector('#demo-coche.visible')", { delai: 15000, message: 'animation de l’accueil' });
  await pause(500);
  await nav.capture(path.join(IMAGES, 'og.png'));
  garder('og.png');

  // 3. Pages publiques : ordinateur (clair et sombre) et téléphone
  const pages = ['/', '/programme', '/vitrine', '/journal', '/a-propos', '/parents', '/connexion', '/mentions-legales', '/confidentialite', '/conditions', '/page-qui-n-existe-pas'];
  const nomDe = (a) => (a === '/' ? 'accueil' : a.slice(1));
  const parcourir = () =>
    nav.evaluer(`(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
      scrollTo(0, 0);
      return true;
    })()`);
  for (const [ecran, largeur, hauteur, theme, liste] of [
    ['ordinateur', 1440, 900, 'clair', pages],
    ['ordinateur-sombre', 1440, 900, 'sombre', ['/', '/programme', '/vitrine', '/journal']],
    ['telephone', 390, 844, 'clair', ['/', '/programme', '/parents', '/vitrine']],
  ]) {
    await nav.taille(largeur, hauteur, 1);
    await nav.evaluer(`(localStorage.setItem('atelier:theme', '${theme}'), true)`);
    for (const adresse of liste) {
      await nav.aller(`${BASE}${adresse}`);
      await parcourir();
      await pause(adresse === '/' ? 7000 : adresse === '/vitrine' ? 2000 : 500);
      const fichier = path.join(CAPTURES, `site-${nomDe(adresse)}-${ecran}.png`);
      await nav.capture(fichier, { pleinePage: true });
      console.log(`📸 ${path.relative(RACINE, fichier)}`);
    }
  }
} finally {
  await nav.fermer();
  appli.temps.io.close();
  rmSync(dossier, { recursive: true, force: true });
}
process.exit(0);
