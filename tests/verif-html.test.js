import { describe, it, expect } from 'vitest';
import { verifierHtml } from '../partage/verif-html.js';
import { ETAPES } from './navigateur/solutions.js';

const messages = (html) => verifierHtml(html).map((r) => `${r.gravite}:${r.ligne}:${r.message}`);

describe('Vérificateur HTML', () => {
  it('ne dit rien sur du HTML correct (toutes les solutions de référence)', () => {
    for (const etape of ETAPES) {
      const erreurs = verifierHtml(etape.html).filter((r) => r.gravite === 'erreur');
      expect(erreurs, `${etape.mission}`).toEqual([]);
    }
    expect(verifierHtml('<!-- Écris ton code ici 👇 -->\n\n<p>3 < 5 et 5 > 3</p><br><img src="a.png" alt="x">')).toEqual([]);
  });

  it('balise jamais fermée', () => {
    expect(messages('<h1>Titre\n<p>texte</p>')).toEqual(['erreur:1:<h1> n’est jamais fermée : il manque </h1>.']);
  });

  it('mauvaise imbrication', () => {
    expect(messages('<p><strong>Oui</p></strong>')[0]).toMatch(/<strong> \(ligne 1\) devrait être fermée avant <\/p>/);
  });

  it('fermeture sans ouverture et balise fermante sur une balise vide', () => {
    expect(messages('<p>a</p></p>')).toEqual(['erreur:1:</p> ferme une balise <p> qui n’a jamais été ouverte (ou qui est déjà fermée).']);
    expect(messages('<img src="a" alt="b"></img>')[0]).toMatch(/conseil.*pas de balise fermante/);
  });

  it('faute de frappe dans une balise : suggestion', () => {
    expect(messages('<h7>Titre</h7>')).toEqual(['erreur:1:La balise <h7> n’existe pas : les titres vont de <h1> (le plus grand) à <h6>.']);
    expect(messages('<buton>Ok</buton>')[0]).toMatch(/Tu voulais dire <button> \?/);
    expect(messages('<pp>x</pp>')[0]).toMatch(/Tu voulais dire <p> \?/);
  });

  it('guillemet oublié, chevron oublié, commentaire pas fermé', () => {
    expect(messages('<img src="a.png alt="photo">')[0]).toMatch(/Il manque un guillemet/);
    expect(messages('<h1 Titre</h1>')[0]).toMatch(/pas fermée par un chevron/);
    expect(messages('<!-- oups\n<h1>x</h1>')[0]).toMatch(/commentaire.*jamais fermé/);
  });

  it('conseils : li hors liste, img sans alt, lien sans href, id en double, bloc dans un p', () => {
    const tout = messages('<li>a</li>\n<img src="x">\n<a>lien</a>\n<p id="z">a</p><p id="z">b</p>\n<p><h2>x</h2></p>');
    expect(tout.join('\n')).toMatch(/<li> doit être à l’intérieur/);
    expect(tout.join('\n')).toMatch(/alt=/);
    expect(tout.join('\n')).toMatch(/href/);
    expect(tout.join('\n')).toMatch(/« z » est déjà utilisé ligne 4/);
    expect(tout.join('\n')).toMatch(/<h2> ne peut pas être à l’intérieur d’un <p>/);
  });

  it('script et style : le contenu n’est pas analysé', () => {
    expect(verifierHtml('<script>if (a < b && c > d) { x = "<p>"; }</script><style>p > a {}</style>')).toEqual([]);
  });

  it('positions pour souligner dans l’éditeur', () => {
    const [r] = verifierHtml('ok\n  <h1>Titre');
    expect(r.ligne).toBe(2);
    expect('ok\n  <h1>Titre'.slice(r.de, r.a)).toBe('<h1>');
  });
});
