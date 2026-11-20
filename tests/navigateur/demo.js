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
    bdd.publier(eleve.id, ['html', 'css', 'js']);
    bdd.definirVitrine(eleve.id, true);
  }
}
// nova : HTML fini, CSS en cours (missions 1 à 3 réussies, la 4e « Fais des cartes » en cours)
for (const id of ['css-1', 'css-2', 'css-3']) bdd.reussirMission(eleves.nova.id, id, false);
bdd.definirMissionCourante(eleves.nova.id, 'css-4');
bdd.noterQuizPropose(eleves.nova.id); // pas de quiz sur la capture
service.attribuerBadges(eleves.nova.id); // pas de notification de badge sur la capture
bdd.definirAccords(eleves.nova.id, { publication: Date.now(), vitrine: Date.now() });
bdd.publier(eleves.nova.id, ['html', 'css']);
bdd.definirVitrine(eleves.nova.id, true);

const nav = await lancerFirefox({ largeur: 1440, hauteur: 900 });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  // 1. L'atelier (illustration de la page d'accueil)
  await nav.aller(`${BASE}/e/${eleves.nova.acces}`);
  await nav.attendre("document.querySelector('#onglet-css')");
  await nav.evaluer("document.querySelector('#onglet-css').click()");
  await nav.attendre("document.querySelectorAll('#checklist li.ok').length >= 2", { message: 'checklist' });
  await nav.evaluer("document.querySelectorAll('.notif').forEach(n => n.remove())");
  // On fait défiler la mission jusqu'à la checklist (qui se coche en direct)
  await nav.evaluer("document.querySelector('#checklist').scrollIntoView({ block: 'end' })");
  await pause(600);
  await nav.capture(IMAGE_ACCUEIL);
  copyFileSync(IMAGE_ACCUEIL, path.join(RACINE, 'dist', 'images', 'apercu-atelier.png'));
  console.log('📸 client/public/images/apercu-atelier.png');

  // 2. Pages publiques, ordinateur puis téléphone
  const pages = [
    ['accueil', '/'],
    ['connexion', '/connexion'],
    ['vitrine', '/vitrine'],
    ['mentions-legales', '/mentions-legales'],
    ['confidentialite', '/confidentialite'],
    ['conditions', '/conditions'],
  ];
  await nav.evaluer("fetch('/api/sortie', { method: 'POST', headers: { 'X-Atelier': '1' } }).then(() => true)");
  for (const [ecran, largeur, hauteur] of [
    ['ordinateur', 1440, 900],
    ['telephone', 390, 844],
  ]) {
    await nav.taille(largeur, hauteur);
    for (const [nom, adresse] of pages) {
      await nav.aller(`${BASE}${adresse}`);
      // Les images et miniatures se chargent au défilement (loading="lazy") : on parcourt la page.
      await nav.evaluer(`(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
        scrollTo(0, 0);
        return true;
      })()`);
      await pause(nom === 'vitrine' || nom === 'accueil' ? 2000 : 400);
      const fichier = path.join(CAPTURES, `site-${nom}-${ecran}.png`);
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
