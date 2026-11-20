// Chargement et contrôle du fichier contenu/missions.js.
// Si tu fais une erreur en modifiant les missions, le serveur refuse de démarrer
// et t'explique précisément ce qui ne va pas.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RACINE } from './config.js';

export const TYPES_VERIFICATION = ['element', 'attribut', 'style', 'regleCss', 'console', 'clic', 'script'];
export const CATEGORIES_MEMO = ['lexique', 'balise', 'propriete', 'js'];

export function controlerCatalogue({ modules, missions, quiz = {} }) {
  const erreurs = [];
  if (!Array.isArray(modules) || !modules.length) erreurs.push('« modules » doit être une liste non vide.');
  if (!Array.isArray(missions)) erreurs.push('« missions » doit être une liste.');
  if (erreurs.length) throw new Error(erreurs.join('\n'));

  const idsModules = new Set();
  for (const m of modules) {
    if (!m.id || !m.titre) erreurs.push(`Module sans id ou sans titre : ${JSON.stringify(m)}`);
    if (!['html', 'css', 'js'].includes(m.id)) erreurs.push(`Module « ${m.id} » : l'id doit être html, css ou js.`);
    idsModules.add(m.id);
    controlerMemo(m.memo, `module ${m.id}`, erreurs);
  }

  const idsMissions = new Set();
  for (const [i, m] of missions.entries()) {
    const ou = `mission n°${i + 1} (${m.id || 'sans id'})`;
    if (!m.id || !/^[a-z0-9-]+$/.test(m.id)) erreurs.push(`${ou} : « id » obligatoire (minuscules, chiffres, tirets).`);
    if (idsMissions.has(m.id)) erreurs.push(`${ou} : l'id « ${m.id} » est déjà utilisé.`);
    idsMissions.add(m.id);
    if (!idsModules.has(m.module)) erreurs.push(`${ou} : module « ${m.module} » inconnu.`);
    for (const champ of ['titre', 'objectif', 'explication']) {
      if (typeof m[champ] !== 'string' || !m[champ].trim()) erreurs.push(`${ou} : « ${champ} » manquant.`);
    }
    if (m.indices && (!Array.isArray(m.indices) || m.indices.length > 2)) erreurs.push(`${ou} : « indices » = liste de 2 indices maximum.`);
    if (m.bonus !== undefined && typeof m.bonus !== 'boolean') erreurs.push(`${ou} : « bonus » doit valoir true ou false.`);
    if (!Array.isArray(m.verifications) || !m.verifications.length) erreurs.push(`${ou} : il faut au moins une vérification.`);
    else controlerVerifications(m.verifications, ou, erreurs);
    controlerMemo(m.memo, ou, erreurs);
  }
  for (const [id, questions] of Object.entries(quiz)) {
    if (!idsMissions.has(id)) erreurs.push(`quiz : la mission « ${id} » n’existe pas.`);
    if (!Array.isArray(questions)) {
      erreurs.push(`quiz « ${id} » : il faut une liste de questions.`);
      continue;
    }
    questions.forEach((q, i) => {
      const ou = `quiz « ${id} », question ${i + 1}`;
      if (typeof q.question !== 'string' || !q.question.trim()) erreurs.push(`${ou} : « question » manquante.`);
      if (!Array.isArray(q.choix) || q.choix.length < 2 || q.choix.length > 4 || q.choix.some((c) => typeof c !== 'string')) erreurs.push(`${ou} : « choix » = 2 à 4 textes.`);
      else if (!Number.isInteger(q.reponse) || q.reponse < 0 || q.reponse >= q.choix.length) erreurs.push(`${ou} : « reponse » doit être la position d’un des choix (0 = le premier).`);
    });
  }
  if (erreurs.length) throw new Error('Problème dans contenu/missions.js :\n  - ' + erreurs.join('\n  - '));
}

function controlerVerifications(liste, ou, erreurs) {
  for (const v of liste) {
    if (!TYPES_VERIFICATION.includes(v.type)) erreurs.push(`${ou} : vérification de type inconnu « ${v.type} » (possibles : ${TYPES_VERIFICATION.join(', ')}).`);
    if (!v.label) erreurs.push(`${ou} : chaque vérification a besoin d'un « label » (affiché dans la checklist).`);
    if (['element', 'attribut', 'style', 'clic'].includes(v.type) && !v.selecteur) erreurs.push(`${ou} : vérification « ${v.type} » sans « selecteur ».`);
    if (v.type === 'attribut' && !v.attribut) erreurs.push(`${ou} : vérification « attribut » sans « attribut ».`);
    if (v.type === 'style' && !v.propriete) erreurs.push(`${ou} : vérification « style » sans « propriete ».`);
    if (v.type === 'script' && typeof v.test !== 'function') erreurs.push(`${ou} : vérification « script » sans fonction « test ».`);
    if (v.type === 'clic' && v.puis) controlerVerifications(v.puis, ou, erreurs);
  }
}

function controlerMemo(memo, ou, erreurs) {
  if (memo === undefined) return;
  if (!Array.isArray(memo)) return erreurs.push(`${ou} : « memo » doit être une liste.`);
  for (const e of memo) {
    if (!e.terme || !e.definition) erreurs.push(`${ou} : entrée du mémo sans « terme » ou « definition ».`);
    if (e.categorie && !CATEGORIES_MEMO.includes(e.categorie)) erreurs.push(`${ou} : catégorie de mémo inconnue « ${e.categorie} ».`);
  }
}

/** Transforme les fonctions « test » en texte pour pouvoir les envoyer au navigateur. */
function serialiserVerifications(liste) {
  return liste.map((v) => {
    const copie = { ...v };
    if (typeof v.test === 'function') copie.test = v.test.toString();
    if (v.puis) copie.puis = serialiserVerifications(v.puis);
    return copie;
  });
}

export async function chargerCatalogue(fichier = path.join(RACINE, 'contenu', 'missions.js')) {
  const mod = await import(pathToFileURL(fichier).href + `?t=${Date.now()}`);
  const catalogue = { modules: mod.modules, missions: mod.missions, quiz: mod.quiz || {} };
  controlerCatalogue(catalogue);
  // Programme public (page /programme) : titres et objectifs seulement.
  catalogue.programme = {
    modules: catalogue.modules.map(({ id, titre, emoji, sousTitre }) => ({ id, titre, emoji, sousTitre })),
    missions: catalogue.missions.map(({ id, module, titre, objectif, bonus }) => ({ id, module, titre, objectif, bonus: Boolean(bonus) })),
  };
  // Version envoyée au navigateur (JSON). Le quiz n'y est PAS : ses réponses restent sur le serveur.
  catalogue.public = {
    modules: catalogue.modules,
    missions: catalogue.missions.map((m) => ({ ...m, verifications: serialiserVerifications(m.verifications) })),
  };
  return catalogue;
}
