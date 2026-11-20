// Règles de déblocage, partagées entre le serveur (qui fait foi) et le navigateur (pour l'affichage).
//
// - Un module est ouvert si le mentor l'a ouvert. Par défaut, seul le premier module (HTML) l'est.
// - Dans un module ouvert, les missions se débloquent l'une après l'autre :
//   la première est disponible, la suivante le devient quand la précédente est réussie.
// - Le mentor peut forcer une mission précise : « ouvert » ou « ferme ».
// - Une mission déjà réussie reste toujours accessible (pour revenir dessus).

export const MODULES_OUVERTS_PAR_DEFAUT = ['html'];

/**
 * @param {{modules: {id:string}[], missions: {id:string, module:string}[]}} catalogue
 * @param {Record<string, 'ouvert'|'ferme'>} deblocages  ex. { 'module:css': 'ouvert', 'mission:js-2': 'ferme' }
 * @param {Set<string>|string[]} reussies  identifiants des missions réussies
 */
export function calculerEtat(catalogue, deblocages = {}, reussies = []) {
  const faites = reussies instanceof Set ? reussies : new Set(reussies);

  const modules = catalogue.modules.map((m) => {
    const force = deblocages[`module:${m.id}`];
    const ouvert = force ? force === 'ouvert' : MODULES_OUVERTS_PAR_DEFAUT.includes(m.id);
    return { id: m.id, ouvert };
  });
  const moduleOuvert = Object.fromEntries(modules.map((m) => [m.id, m.ouvert]));

  const missions = [];
  for (const m of catalogue.modules) {
    const duModule = catalogue.missions.filter((x) => x.module === m.id);
    duModule.forEach((mission, index) => {
      const force = deblocages[`mission:${mission.id}`];
      const reussie = faites.has(mission.id);
      const precedenteFaite = index === 0 || faites.has(duModule[index - 1].id);
      let accessible;
      if (force === 'ferme') accessible = false;
      else if (force === 'ouvert') accessible = true;
      else accessible = moduleOuvert[m.id] && (reussie || precedenteFaite);
      missions.push({
        id: mission.id,
        module: m.id,
        statut: !accessible ? 'verrouillee' : reussie ? 'reussie' : 'disponible',
        force: force || null,
      });
    });
  }

  // Un onglet de l'éditeur (CSS, JS) est visible si son module est ouvert
  // ou si au moins une de ses missions est accessible.
  const onglets = modules
    .filter((m) => m.ouvert || missions.some((x) => x.module === m.id && x.statut !== 'verrouillee'))
    .map((m) => m.id);

  return { modules, missions, onglets };
}

export function missionAccessible(etat, missionId) {
  const m = etat.missions.find((x) => x.id === missionId);
  return Boolean(m && m.statut !== 'verrouillee');
}

/** Mission à proposer par défaut : la première disponible non réussie, sinon la dernière accessible. */
export function missionParDefaut(etat) {
  const dispo = etat.missions.find((m) => m.statut === 'disponible');
  if (dispo) return dispo.id;
  const accessibles = etat.missions.filter((m) => m.statut !== 'verrouillee');
  return accessibles.length ? accessibles[accessibles.length - 1].id : null;
}

// ---------------------------------------------------------------------------
// Assemblage de la page complète à partir des trois onglets.
// L'onglet HTML ne contient que le contenu du <body> : on ajoute le reste ici.
// ---------------------------------------------------------------------------

export function echapperHtml(texte) {
  return String(texte)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Devine un titre de page à partir du premier <h1>. */
export function titreDepuisHtml(html, defaut = 'Mon site') {
  const m = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html || '');
  if (!m) return defaut;
  const entites = { '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ', '&amp;': '&' };
  const texte = m[1]
    .replace(/<[^>]*>/g, '')
    .replace(/&(lt|gt|quot|#39|nbsp|amp);/g, (e) => entites[e])
    .replace(/\s+/g, ' ')
    .trim();
  return texte ? texte.slice(0, 80) : defaut;
}

/**
 * @param {{html?:string, css?:string, js?:string}} code
 * @param {{titre?:string, enTete?:string, onglets?:string[]}} options
 *   enTete : code injecté en tout premier dans <head> (la sonde de l'aperçu).
 *   onglets : modules débloqués ; un onglet non débloqué n'est pas inclus.
 */
export function assemblerPage(code, options = {}) {
  const onglets = options.onglets || ['html', 'css', 'js'];
  const html = code.html || '';
  const css = onglets.includes('css') ? code.css || '' : '';
  // Empêche « </script> » écrit dans le JS de fermer la balise trop tôt.
  const js = onglets.includes('js') ? (code.js || '').replace(/<\/script/gi, '<\\/script') : '';
  const titre = echapperHtml(options.titre || titreDepuisHtml(html));
  return [
    '<!DOCTYPE html>',
    '<html lang="fr">',
    '<head>',
    options.enTete || '',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${titre}</title>`,
    `<style id="atelier-css">\n${css}\n</style>`,
    '</head>',
    '<body>',
    html,
    js.trim() ? `<script id="atelier-js">\n${js}\n</script>` : '',
    '</body>',
    '</html>',
  ].join('\n');
}

/** Numéro de la ligne (1 = première) où commence le JS de l'élève dans la page assemblée. */
export function ligneDebutJs(page) {
  const i = page.indexOf('<script id="atelier-js">');
  if (i < 0) return null;
  return page.slice(0, i).split('\n').length + 1;
}
