// Audit d'accessibilité automatique avec axe-core (WCAG 2.1 niveaux A et AA + bonnes pratiques).
// axe-core est une bibliothèque JavaScript (npm) : aucun navigateur à télécharger.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

/** Lance axe sur la page actuelle. Renvoie la liste des problèmes (règle, gravité, éléments). */
export async function auditer(nav, { exclure = [] } = {}) {
  await nav.evaluer(`(() => { if (!window.axe) { ${AXE}\n } return true; })()`);
  const resultat = await nav.evaluer(`axe.run({ exclude: ${JSON.stringify(exclure.map((s) => [s]))} }, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
      iframes: false,
      resultTypes: ['violations'],
    }).then((r) => JSON.stringify(r.violations.map((v) => ({
      regle: v.id, gravite: v.impact, aide: v.help,
      elements: v.nodes.slice(0, 4).map((n) => n.target.join(' ') + (n.failureSummary ? ' : ' + n.failureSummary.split('\\n')[1]?.trim() : '')),
    }))))`);
  return JSON.parse(resultat);
}
