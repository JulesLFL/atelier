// Téléchargement du site d'un élève en .zip : les fichiers qu'il a écrits, prêts à ouvrir.
import { assemblerPageFichiers } from '../partage/regles.js';
import { creerZip } from './zip.js';

const LISEZMOI = (pseudo) => `Le site de ${pseudo}, créé à L'Atelier.

Pour l'ouvrir : double-clique sur index.html (il s'ouvre dans ton navigateur).
Pour le modifier : ouvre les fichiers avec un éditeur de code (par exemple VS Code).

- index.html : le contenu de ta page (HTML)
- style.css  : son style (CSS)
- script.js  : son comportement (JavaScript)
`;

export function envoyerZip(res, eleve, service) {
  service.ecrireMaintenant(eleve.id);
  const code = service.codeActuel(eleve.id);
  const { onglets } = service.etatDeblocage(eleve.id);
  const fichiers = [
    { nom: `site-${eleve.pseudo}/index.html`, contenu: assemblerPageFichiers(code, onglets) },
    onglets.includes('css') && { nom: `site-${eleve.pseudo}/style.css`, contenu: code.css },
    onglets.includes('js') && { nom: `site-${eleve.pseudo}/script.js`, contenu: code.js },
    { nom: `site-${eleve.pseudo}/LISEZMOI.txt`, contenu: LISEZMOI(eleve.pseudo) },
  ].filter(Boolean);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="site-${eleve.pseudo}.zip"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(creerZip(fichiers));
}
