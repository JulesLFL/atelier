import { describe, it, expect } from 'vitest';
import { protegerBoucles } from '../partage/garde-boucles.js';
import { traduireErreur } from '../client/src/commun/erreurs-fr.js';

describe('Garde des boucles', () => {
  it('ajoute une garde dans chaque boucle sans changer les lignes', () => {
    const code = 'let i = 0;\nwhile (true) {\n  i++;\n}\nfor (let j = 0; j < 3; j++) console.log(j);\ndo { i-- } while (i > 0);';
    const protege = protegerBoucles(code);
    expect(protege.split('\n').length).toBe(code.split('\n').length);
    expect(protege.match(/__atelierGarde\(\)/g).length).toBe(3);
    expect(protege).toContain('for (let j = 0; j < 3; j++) { if (window.__atelierGarde && window.__atelierGarde()) break; console.log(j); }');
    // Le code protégé reste du JS valide qui s'exécute
    globalThis.window = { __atelierGarde: () => false };
    expect(() => new Function(protege.replace('while (true)', 'while (i < 5)'))()).not.toThrow();
  });

  it('ne touche pas au texte qui contient le mot « for »', () => {
    const code = 'console.log("for while do");';
    expect(protegerBoucles(code)).toBe(code);
  });

  it('arrête vraiment une boucle infinie', () => {
    let n = 0;
    globalThis.window = { __atelierGarde: () => ++n > 1000 };
    new Function(protegerBoucles('while (true) { }'))();
    expect(n).toBe(1001);
  });
});

describe('Erreurs en français', () => {
  const cas = [
    ['ReferenceError: bouton is not defined', /Je ne connais pas « bouton »/],
    ["TypeError: Cannot read properties of null (reading 'addEventListener')", /Élément introuvable/],
    ['TypeError: document.querySelector(...) is null', /Élément introuvable/],
    ['TypeError: can\'t access property "textContent", titre is null', /Élément introuvable/],
    ['TypeError: document.querySelecter is not a function', /n’est pas une fonction/],
    ['SyntaxError: missing ) after argument list', /parenthèse/],
    ['SyntaxError: Unexpected end of input', /accolade/],
    ['SyntaxError: Invalid or unexpected token', /guillemet|pas bien fermé/],
    ['SyntaxError: unterminated string literal', /pas bien fermé/],
    ["SyntaxError: Identifier 'a' has already been declared", /« a » existe déjà/],
    ['TypeError: Assignment to constant variable.', /constante/],
    ["SyntaxError: Unexpected token '}'", /Je ne comprends pas « } »/],
    ['ATELIER_BOUCLE_INFINIE', /Boucle infinie/],
  ];
  for (const [message, attendu] of cas) {
    it(message, () => expect(traduireErreur(message).titre).toMatch(attendu));
  }
  it('garde le message original quand il ne sait pas traduire', () => {
    const r = traduireErreur('Error: truc bizarre');
    expect(r.titre).toBe('Erreur dans ton JavaScript');
    expect(r.original).toBe('Error: truc bizarre');
  });
});
