// npm run build && npm run test:accessibilite
// Audit axe-core de toutes les pages (thèmes clair et sombre), de l'atelier et du panneau mentor.
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { lancerFirefox } from './bidi.js';
import { auditer } from './axe.js';
import { chargerConfig } from '../../serveur/config.js';
import { creerApplication } from '../../serveur/app.js';

process.env.ATELIER_SANS_DOTENV = '1';
const dossier = mkdtempSync(path.join(os.tmpdir(), 'atelier-a11y-'));
const MDP = 'mentor-a11y-1234';
const config = chargerConfig({ MENTOR_PASSWORD: MDP, SESSION_SECRET: 'a'.repeat(40), DATA_DIR: path.join(dossier, 'd'), SAUVEGARDE_DOSSIER: path.join(dossier, 's'), PUBLIC_URL: 'http://127.0.0.1:3996', COOKIE_SECURE: 'false' });
const appli = await creerApplication(config, { sauvegardesAuto: false });
await new Promise((r) => appli.serveur.listen(3996, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:3996';
const { eleve, code } = appli.bdd.creerEleve('alex');
appli.bdd.majProjet(eleve.id, { html: '<h1>Mon site</h1>', css: '', js: '' });
appli.bdd.definirAccords(eleve.id, { publication: Date.now(), vitrine: Date.now() });
appli.bdd.definirParentsInformes(eleve.id, Date.now());
appli.bdd.accepterCharte(eleve.id);
appli.bdd.publier(eleve.id, ['html']);
appli.bdd.definirVitrine(eleve.id, true);
appli.bdd.noterQuizPropose(eleve.id);

const nav = await lancerFirefox();
let total = 0;
const rapport = (nom, problemes) => {
  total += problemes.length;
  console.log(`${problemes.length ? '❌' : '✅'} ${nom}${problemes.length ? '' : ' : aucun problème'}`);
  for (const p of problemes) console.log(`   [${p.gravite}] ${p.regle} : ${p.aide}\n      ${p.elements.join('\n      ')}`);
};
try {
  for (const theme of ['clair', 'sombre']) {
    await nav.aller(`${BASE}/`);
    await nav.evaluer(`(localStorage.setItem('atelier:theme', '${theme}'), true)`);
    for (const page of ['/', '/programme', '/vitrine', '/journal', '/a-propos', '/parents', '/connexion', '/mentions-legales', '/confidentialite', '/conditions', '/page-inexistante']) {
      await nav.aller(`${BASE}${page}`);
      await new Promise((r) => setTimeout(r, 900));
      rapport(`${page} (${theme})`, await auditer(nav));
    }
  }
  // L'atelier de l'élève (le contenu de l'éditeur CodeMirror et l'aperçu sont exclus : ce sont des outils tiers / le code de l'élève)
  await nav.aller(`${BASE}/e/${code}`);
  await nav.attendre("document.querySelector('#checklist li')");
  await new Promise((r) => setTimeout(r, 1200));
  rapport('/atelier', await auditer(nav, { exclure: ['.cm-editor', '.cadre-apercu'] }));
  await nav.aller(`${BASE}/diplome`);
  await new Promise((r) => setTimeout(r, 800));
  rapport('/diplome', await auditer(nav));
  // Panneau mentor
  await nav.aller(`${BASE}/mentor`);
  await nav.attendre("document.querySelector('#mdp')");
  await new Promise((r) => setTimeout(r, 800)); // fin de l'animation d'apparition
  rapport('/mentor (connexion)', await auditer(nav));
  await nav.taper(`${MDP}\n`);
  await nav.attendre("document.querySelector('.liste-eleves .eleve')");
  await nav.evaluer("document.querySelector('.liste-eleves .eleve').click()");
  await nav.attendre("document.querySelector('.grille-direct')");
  await new Promise((r) => setTimeout(r, 800));
  rapport('/mentor (direct)', await auditer(nav, { exclure: ['.cm-editor', '.cadre-apercu'] }));
} finally {
  await nav.fermer();
  appli.temps.io.close();
  rmSync(dossier, { recursive: true, force: true });
}
console.log(total ? `\n❌ ${total} problème(s) d'accessibilité` : '\n✅ Aucun problème d’accessibilité détecté');
process.exit(total ? 1 : 0);
