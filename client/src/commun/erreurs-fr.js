// Traduction des erreurs JavaScript en français simple.
// Les messages diffèrent selon le navigateur (Chrome/Edge, Firefox, Safari) : on couvre les trois.

const REGLES = [
  {
    motif: /^ATELIER_BOUCLE_INFINIE$/,
    titre: 'Boucle infinie arrêtée 🛑',
    aide: () => 'Une de tes boucles (for, while) tournait sans jamais s’arrêter. Vérifie que sa condition finit par devenir fausse.',
  },
  {
    motif: /(?:ReferenceError: )?(?:Can't find variable: )?['"]?([\w$]+)['"]? is not defined|Can't find variable: ([\w$]+)/,
    titre: (m) => `Je ne connais pas « ${m[1] || m[2]} »`,
    aide: (m) =>
      `« ${m[1] || m[2]} » n’existe pas. Faute de frappe ? (Attention aux majuscules : « Document » ≠ « document ».) Ou tu as oublié de créer la variable avec let ?`,
  },
  {
    motif: /Cannot (?:read|set) propert(?:y|ies) of (null|undefined)(?: \((?:reading|setting) '([^']+)'\))?|can't access property "?([\w$]+)"?, .* is (null|undefined)|(\S+) is (null|undefined)$|null is not an object/i,
    titre: () => 'Élément introuvable',
    aide: (m) => {
      const prop = m[2] || m[3];
      return (
        'Tu essaies d’utiliser quelque chose qui est vide (null). Le plus souvent : ton querySelector n’a rien trouvé. ' +
        'Vérifie que l’élément existe bien dans ton HTML et que le sélecteur est correct (# pour un id, . pour une classe).' +
        (prop ? ` (Tu voulais utiliser « ${prop} ».)` : '')
      );
    },
  },
  {
    motif: /([\w$.]+(?:\(\.\.\.\))?) is not a function/,
    titre: (m) => `« ${m[1]} » n’est pas une fonction`,
    aide: () => 'Vérifie l’orthographe et les majuscules : par exemple « addEventListener » (avec E et L majuscules), « querySelector » (avec S majuscule).',
  },
  {
    motif: /Assignment to constant variable|invalid assignment to const|Attempted to assign to readonly property/,
    titre: () => 'On ne peut pas changer une constante',
    aide: () => 'Cette variable a été créée avec const, donc elle ne peut pas changer. Utilise let à la place.',
  },
  {
    motif: /Identifier '([\w$]+)' has already been declared|redeclaration of (?:let|const) ([\w$]+)|Cannot declare a (?:let|const) variable twice: '([\w$]+)'/,
    titre: (m) => `« ${m[1] || m[2] || m[3]} » existe déjà`,
    aide: () => 'Tu as créé deux fois une variable avec le même nom. Supprime le deuxième let (ou change de nom).',
  },
  {
    motif: /Cannot access '([\w$]+)' before initialization|can't access lexical declaration '([\w$]+)' before initialization/,
    titre: (m) => `« ${m[1] || m[2]} » est utilisée trop tôt`,
    aide: () => 'Tu utilises une variable avant la ligne où elle est créée. Déplace le « let » plus haut.',
  },
  {
    motif: /missing \) after argument list|missing \) after/,
    titre: () => 'Il manque une parenthèse « ) »',
    aide: () => 'Chaque parenthèse ouverte « ( » doit être fermée « ) ». Vérifie aussi les guillemets autour du texte.',
  },
  {
    motif: /Unexpected end of input|missing } |expected '}'|end of script/i,
    titre: () => 'Il manque une accolade « } »',
    aide: () => 'Chaque accolade ouverte « { » doit être fermée « } ». Compte-les : il y en a une de trop d’un côté.',
  },
  {
    motif: /Invalid or unexpected token|unterminated string literal|Unexpected EOF|Unterminated string/i,
    titre: () => 'Un texte n’est pas bien fermé',
    aide: () => 'Il manque sûrement un guillemet. Un texte commence et finit par le même guillemet : "comme ça".',
  },
  {
    motif: /Unexpected token '?(.+?)'?$|expected expression, got '?(.+?)'?$|unexpected token: '?(.+?)'?$|Unexpected identifier '?([\w$]+)'?/i,
    titre: (m) => `Je ne comprends pas « ${m[1] || m[2] || m[3] || m[4]} » ici`,
    aide: () => 'Il y a une faute de syntaxe : un symbole en trop ou manquant. Regarde la ligne indiquée et celle juste avant (parenthèses, accolades, guillemets, virgules).',
  },
  {
    motif: /Maximum call stack size exceeded|too much recursion/,
    titre: () => 'Une fonction s’appelle en boucle',
    aide: () => 'Une fonction s’appelle elle-même sans jamais s’arrêter.',
  },
  {
    motif: /is not a valid selector|An invalid or illegal string was specified/,
    titre: () => 'Sélecteur invalide',
    aide: () => 'Le texte donné à querySelector n’est pas un sélecteur CSS valide. Exemples corrects : "h1", "#monId", ".maClasse".',
  },
];

/** @returns {{titre: string, aide: string|null, original: string}} */
export function traduireErreur(message) {
  const original = String(message || '').replace(/^Uncaught\s+/, '');
  const sansType = original.replace(/^(?:\w*Error): /, '');
  for (const regle of REGLES) {
    const m = regle.motif.exec(original) || regle.motif.exec(sansType);
    if (m) {
      const titre = typeof regle.titre === 'function' ? regle.titre(m) : regle.titre;
      return { titre, aide: regle.aide(m), original: original === 'ATELIER_BOUCLE_INFINIE' ? '' : original };
    }
  }
  return { titre: 'Erreur dans ton JavaScript', aide: null, original };
}
