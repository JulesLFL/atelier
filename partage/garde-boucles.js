// Protection contre les boucles infinies.
// Une boucle « while (true) {} » écrite par erreur gèlerait tout l'onglet.
// On ajoute donc au début de chaque boucle : « if (__atelierGarde()) break; »
// La sonde arrête la boucle si elle tourne plus de 1,5 s d'affilée.
// Le code est analysé avec le vrai parseur JavaScript de CodeMirror (pas de bricolage
// avec des expressions régulières) et les numéros de ligne ne changent pas.
import { parser } from '@lezer/javascript';

const GARDE = 'if (window.__atelierGarde && window.__atelierGarde()) break;';
const BOUCLES = new Set(['ForStatement', 'WhileStatement', 'DoStatement']);

export function protegerBoucles(code) {
  if (!code || !/\b(for|while|do)\b/.test(code)) return code;
  let arbre;
  try {
    arbre = parser.parse(code);
  } catch {
    return code;
  }
  const insertions = []; // { position, texte }
  arbre.iterate({
    enter(noeud) {
      if (!BOUCLES.has(noeud.name)) return;
      // Le corps de la boucle : le dernier enfant pour for/while, le premier « statement » pour do…while.
      const n = noeud.node;
      let corps = null;
      for (let enfant = n.firstChild; enfant; enfant = enfant.nextSibling) {
        if (enfant.name === 'Block' || /Statement$|Declaration$/.test(enfant.name)) {
          corps = enfant;
          if (noeud.name === 'DoStatement') break;
        }
      }
      if (!corps || corps.type.isError) return;
      if (corps.name === 'Block') {
        insertions.push({ position: corps.from + 1, texte: ` ${GARDE}` });
      } else {
        insertions.push({ position: corps.from, texte: `{ ${GARDE} ` });
        insertions.push({ position: corps.to, texte: ' }' });
      }
    },
  });
  if (!insertions.length) return code;
  insertions.sort((a, b) => b.position - a.position);
  let resultat = code;
  for (const { position, texte } of insertions) resultat = resultat.slice(0, position) + texte + resultat.slice(position);
  return resultat;
}
