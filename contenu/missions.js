// ============================================================================
//  LES MISSIONS DE L'ATELIER
//  C'est le SEUL fichier à modifier pour ajouter, changer ou réordonner une mission.
//  Après modification : redémarre le serveur (ou le conteneur). S'il y a une erreur
//  dans ce fichier, le serveur refuse de démarrer et explique ce qui ne va pas.
// ============================================================================
//
//  FORMAT D'UNE MISSION
//  {
//    id: 'html-9',                 identifiant unique (minuscules, chiffres, tirets) — NE PAS le changer
//                                  une fois que l'élève a commencé, sinon sa progression est perdue
//    module: 'html',               'html', 'css' ou 'js'
//    titre: '…',                   titre court
//    objectif: '…',                ce qu'il faut faire, en UNE phrase
//    explication: `…`,             le nouveau concept. Mise en forme possible :
//                                    **gras**, *italique*, `code`, ligne vide = nouveau paragraphe,
//                                    lignes commençant par « - » = liste
//    exemple: '…' ou { html: '…', css: '…', js: '…' }   code d'exemple (copiable / insérable)
//    indices: ['indice 1', 'indice 2'],                 2 niveaux maximum (même mise en forme)
//    memo: [ { terme, categorie, definition, exemple } ] entrées ajoutées au mémo quand la mission
//                                  est débloquée. categorie : 'lexique', 'balise', 'propriete' ou 'js'
//    verifications: [ … ]          la mission est réussie quand TOUTES sont vraies
//  }
//
//  LES VÉRIFICATIONS (exécutées dans l'aperçu, sur la vraie page de l'élève)
//  Chacune a un « label » : la ligne affichée dans la checklist de la mission.
//
//  { type: 'element', selecteur: 'ul > li', min: 3, max: 10, texteMin: 1 }
//      au moins « min » éléments (1 par défaut) correspondent au sélecteur CSS,
//      en ne comptant que ceux qui contiennent au moins « texteMin » caractères.
//  { type: 'attribut', selecteur: 'img', attribut: 'src', motif: '^https?://' }
//      au moins un élément a cet attribut non vide (et qui respecte l'expression régulière « motif »).
//  { type: 'style', selecteur: 'body', propriete: 'background-color', pasDefaut: true }
//      au moins un élément a un style calculé différent de celui du navigateur sans CSS.
//      « propriete » peut être une liste : il suffit qu'une seule ait changé.
//      À la place de pasDefaut : egal: 'rgb(255, 0, 0)' ou contient: 'serif'.
//  { type: 'regleCss', contient: ':hover', proprietes: ['transition'] }
//      le CSS contient une règle dont le sélecteur contient « contient » (optionnel)
//      et qui définit au moins une des « proprietes » (optionnel).
//  { type: 'console', min: 1 }
//      le code a affiché au moins « min » messages avec console.log.
//  { type: 'clic', selecteur: 'button', fois: 1, changement: 'dom', puis: [ …vérifications… ] }
//      clique sur le premier élément trouvé, puis vérifie que la page a changé
//      (changement: 'dom') et/ou que les vérifications « puis » sont vraies.
//  { type: 'script', test: async (doc, outils) => true }
//      ta propre fonction, exécutée DANS l'aperçu. Elle renvoie true si c'est réussi.
//      outils : attendre(ms), cliquer(element, fois), source {html, css, js},
//               texteVisible(document), pageSansJs() (la page avant que le JS ne tourne),
//               imageChargee(img).
//      ⚠️ La fonction est envoyée telle quelle à l'aperçu : elle ne peut utiliser QUE
//      ses paramètres (doc, outils) et les variables globales du navigateur.
// ============================================================================

export const modules = [
  {
    id: 'html',
    titre: 'HTML',
    emoji: '🧱',
    sousTitre: 'La structure de ta page',
    memo: [
      {
        terme: 'Code',
        categorie: 'lexique',
        definition: 'Du texte écrit dans un langage que l’ordinateur comprend. Ici : HTML, CSS et JavaScript.',
      },
      {
        terme: 'Navigateur',
        categorie: 'lexique',
        definition: 'Le logiciel qui lit ton code et l’affiche sous forme de page : Chrome, Firefox, Edge, Safari…',
      },
      {
        terme: 'Commentaire HTML',
        categorie: 'lexique',
        definition: 'Une note pour toi, ignorée par le navigateur. Pratique pour s’y retrouver.',
        exemple: '<!-- Ici commence ma liste -->',
      },
      {
        terme: '<br>',
        categorie: 'balise',
        definition: 'Force un retour à la ligne dans un texte. Pas de balise fermante.',
        exemple: '<p>Première ligne<br>Deuxième ligne</p>',
      },
      {
        terme: '<ol> et <li>',
        categorie: 'balise',
        definition: 'Comme <ul>, mais une liste numérotée (1, 2, 3…).',
        exemple: '<ol>\n  <li>Premier</li>\n  <li>Deuxième</li>\n</ol>',
      },
    ],
  },
  {
    id: 'css',
    titre: 'CSS',
    emoji: '🎨',
    sousTitre: 'Le style de ta page',
    memo: [
      {
        terme: 'Commentaire CSS',
        categorie: 'lexique',
        definition: 'Une note ignorée par le navigateur.',
        exemple: '/* Les couleurs du titre */',
      },
      {
        terme: 'text-align',
        categorie: 'propriete',
        definition: 'Aligne le texte : left (gauche), center (centre), right (droite).',
        exemple: 'h1 {\n  text-align: center;\n}',
      },
      {
        terme: 'border',
        categorie: 'propriete',
        definition: 'Une bordure : épaisseur, style (solid, dashed, dotted) et couleur.',
        exemple: '.carte {\n  border: 3px solid gold;\n}',
      },
      {
        terme: 'box-shadow',
        categorie: 'propriete',
        definition: 'Une ombre autour d’un élément : décalage x, décalage y, flou, couleur.',
        exemple: '.carte {\n  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);\n}',
      },
      {
        terme: 'display: flex',
        categorie: 'propriete',
        definition: 'Range les éléments enfants côte à côte. « gap » règle l’espace entre eux.',
        exemple: '.galerie {\n  display: flex;\n  gap: 16px;\n}',
      },
      {
        terme: 'linear-gradient',
        categorie: 'propriete',
        definition: 'Un dégradé de couleurs, à utiliser avec « background ».',
        exemple: 'body {\n  background: linear-gradient(135deg, #1e1b4b, #7c3aed);\n}',
      },
    ],
  },
  {
    id: 'js',
    titre: 'JavaScript',
    emoji: '⚡',
    sousTitre: 'Rends ta page vivante',
    memo: [
      {
        terme: 'Commentaire JS',
        categorie: 'lexique',
        definition: 'Une note ignorée par l’ordinateur. Commence par deux barres obliques.',
        exemple: '// Ceci est un commentaire',
      },
      {
        terme: 'if / else',
        categorie: 'js',
        definition: 'Une condition : « si… alors…, sinon… ». Les comparaisons : === (égal), > , < .',
        exemple: 'if (compteur > 10) {\n  console.log("Tu es populaire !");\n} else {\n  console.log("Continue !");\n}',
      },
      {
        terme: 'alert()',
        categorie: 'js',
        definition: 'Affiche un message par-dessus la page.',
        exemple: 'alert("Bienvenue sur mon site !");',
      },
      {
        terme: 'Choisir au hasard',
        categorie: 'js',
        definition: 'Une liste (un « tableau ») entre crochets, et Math.random() pour piocher dedans.',
        exemple: 'let blagues = ["Blague 1", "Blague 2", "Blague 3"];\nlet auHasard = blagues[Math.floor(Math.random() * blagues.length)];\nconsole.log(auHasard);',
      },
      {
        terme: 'Afficher / cacher',
        categorie: 'js',
        definition: 'L’attribut « hidden » cache un élément. Le JS peut l’inverser à chaque clic.',
        exemple: 'let secret = document.querySelector("#secret");\nsecret.hidden = !secret.hidden;',
      },
    ],
  },
];

export const missions = [
  // ==========================================================================
  //  MODULE HTML
  // ==========================================================================
  {
    id: 'html-1',
    module: 'html',
    titre: 'Ton tout premier titre',
    objectif: 'Écris un grand titre avec le nom de ton site.',
    explication: `Une page web est écrite en **HTML**. Ce langage dit au navigateur *ce qu'est* chaque morceau de texte : un titre, un paragraphe, une image…

Pour ça, on utilise des **balises** : un mot entre chevrons \`< >\`. On ouvre avec \`<h1>\` et on ferme avec \`</h1>\` (avec une barre \`/\`). Ce qui est entre les deux s'affiche dans la page.

\`h1\` veut dire « heading 1 » : le titre le plus important. Le thème de ton site, c'est toi qui choisis : jeux vidéo, foot, musique, mangas… 😎`,
    exemple: '<h1>Le repaire des gamers</h1>',
    indices: [
      'Tape `<h1>`, puis le nom de ton site, puis `</h1>`. L’éditeur ferme parfois la balise tout seul 😉',
      'Copie l’exemple et remplace le texte par le nom de TON site : `<h1>Le nom de mon site</h1>`',
    ],
    memo: [
      { terme: 'HTML', categorie: 'lexique', definition: 'Le langage qui décrit le contenu et la structure d’une page web.' },
      {
        terme: 'Balise',
        categorie: 'lexique',
        definition: 'Un mot entre chevrons qui dit ce qu’est un contenu. Elle s’ouvre <…> et se ferme </…>.',
        exemple: '<h1>Mon titre</h1>',
      },
      { terme: '<h1>', categorie: 'balise', definition: 'Le titre principal de la page (un seul par page, en général).', exemple: '<h1>Mon super site</h1>' },
    ],
    verifications: [{ type: 'element', selecteur: 'h1', texteMin: 2, label: 'Un titre <h1> avec du texte dedans' }],
  },
  {
    id: 'html-2',
    module: 'html',
    titre: 'Présente ton site',
    objectif: 'Sous ton titre, écris une ou deux phrases qui présentent ton site.',
    explication: `Pour du texte normal, on utilise la balise \`<p>\`, comme *paragraphe*.

Une balise ouvrante, son contenu et sa balise fermante forment un **élément**. Ta page est une suite d'éléments.

Petit secret : en HTML, aller à la ligne dans ton code ne fait **pas** aller à la ligne dans la page. Chaque \`<p>\` crée un nouveau bloc de texte.`,
    exemple: '<p>Ici, je partage mes jeux préférés et mes meilleures astuces.</p>',
    indices: [
      'Place-toi sous la ligne de ton `</h1>`, appuie sur Entrée et tape `<p>`.',
      'Écris par exemple : `<p>Bienvenue sur mon site ! Ici je parle de…</p>`',
    ],
    memo: [
      {
        terme: 'Élément',
        categorie: 'lexique',
        definition: 'Balise ouvrante + contenu + balise fermante. Ex. : tout le <p>…</p>.',
        exemple: '<p>Je suis un élément</p>',
      },
      { terme: '<p>', categorie: 'balise', definition: 'Un paragraphe de texte.', exemple: '<p>Bienvenue sur mon site !</p>' },
    ],
    verifications: [{ type: 'element', selecteur: 'p', texteMin: 10, label: 'Un paragraphe <p> d’au moins 10 caractères' }],
  },
  {
    id: 'html-3',
    module: 'html',
    titre: 'Découpe en sections',
    objectif: 'Ajoute deux sous-titres pour découper ta page en parties.',
    explication: `Un bon site est découpé en parties. \`<h2>\` est un **sous-titre** : moins gros que \`<h1>\`. Il existe même \`<h3>\`, \`<h4>\`… jusqu'à \`<h6>\`, de plus en plus petits.

Ajoute **deux** sous-titres, par exemple « Mes jeux préférés » et « Mes astuces ». Tu peux mettre un paragraphe sous chacun.`,
    exemple: '<h2>Mes jeux préférés</h2>\n<p>Voici ceux auxquels je joue le plus.</p>\n\n<h2>Mes astuces</h2>\n<p>Quelques conseils pour progresser.</p>',
    indices: ['Un sous-titre s’écrit comme ton titre, mais avec `h2` au lieu de `h1`.', 'Écris deux fois : `<h2>Le nom de la partie</h2>`'],
    memo: [
      {
        terme: '<h2> à <h6>',
        categorie: 'balise',
        definition: 'Des sous-titres, du plus important (h2) au moins important (h6).',
        exemple: '<h2>Une partie</h2>\n<h3>Une sous-partie</h3>',
      },
    ],
    verifications: [{ type: 'element', selecteur: 'h2', min: 2, texteMin: 2, label: 'Au moins 2 sous-titres <h2>' }],
  },
  {
    id: 'html-4',
    module: 'html',
    titre: 'Mets du punch',
    objectif: 'Mets un mot important en valeur à l’intérieur d’un de tes paragraphes.',
    explication: `Tu peux mettre des balises **à l'intérieur** d'autres balises. Ça s'appelle **imbriquer**.

- \`<strong>\` : un mot important (affiché en gras)
- \`<em>\` : un mot sur lequel on insiste (affiché en italique)

Attention à l'ordre : la dernière balise ouverte est la première fermée. \`<p><strong>…</strong></p>\` ✅ et pas \`<p><strong>…</p></strong>\` ❌`,
    exemple: '<p>Ce jeu est <strong>incroyable</strong>, je te le <em>jure</em>.</p>',
    indices: ['Choisis un mot dans un de tes `<p>` et entoure-le avec `<strong>` et `</strong>`.', 'Exemple : `<p>Mon jeu préféré est <strong>Minecraft</strong>.</p>`'],
    memo: [
      {
        terme: 'Imbriquer',
        categorie: 'lexique',
        definition: 'Mettre un élément à l’intérieur d’un autre. On ferme dans l’ordre inverse de l’ouverture.',
        exemple: '<p>Un mot <strong>important</strong></p>',
      },
      { terme: '<strong>', categorie: 'balise', definition: 'Un texte important, en gras.', exemple: '<strong>Attention !</strong>' },
      { terme: '<em>', categorie: 'balise', definition: 'Un texte sur lequel on insiste, en italique.', exemple: '<em>vraiment</em>' },
    ],
    verifications: [{ type: 'element', selecteur: 'p strong, p em', texteMin: 1, label: 'Un mot en <strong> ou <em> dans un paragraphe' }],
  },
  {
    id: 'html-5',
    module: 'html',
    titre: 'Ton top 3',
    objectif: 'Fais une liste à puces avec ton top 3.',
    explication: `Une liste à puces se fait avec deux balises qui travaillent ensemble :

- \`<ul>\` entoure toute la liste
- \`<li>\` contient chaque élément de la liste (*list item*)

Fais le top 3 de ton thème : 3 jeux, 3 joueurs, 3 chansons, 3 persos…`,
    exemple: '<ul>\n  <li>Minecraft</li>\n  <li>Rocket League</li>\n  <li>Zelda</li>\n</ul>',
    indices: ['Commence par `<ul>`, puis à l’intérieur, mets trois lignes `<li>…</li>`, et termine par `</ul>`.', 'Copie l’exemple et remplace les trois noms par les tiens.'],
    memo: [
      {
        terme: '<ul> et <li>',
        categorie: 'balise',
        definition: 'Une liste à puces : <ul> entoure la liste, <li> pour chaque élément.',
        exemple: '<ul>\n  <li>Un</li>\n  <li>Deux</li>\n</ul>',
      },
    ],
    verifications: [
      { type: 'element', selecteur: 'ul', label: 'Une liste <ul>' },
      { type: 'element', selecteur: 'ul > li', min: 3, texteMin: 1, label: 'Au moins 3 éléments <li> dans ta liste' },
    ],
  },
  {
    id: 'html-6',
    module: 'html',
    titre: 'Une image qui claque',
    objectif: 'Ajoute une image en rapport avec ton thème.',
    explication: `Pour une image, on utilise \`<img>\`. Elle est spéciale : **pas de balise fermante**.

Elle a besoin d'**attributs** : des informations en plus, écrites dans la balise ouvrante sous la forme \`nom="valeur"\`.

- \`src\` : l'adresse de l'image sur internet (son **URL**)
- \`alt\` : une courte description, lue par ceux qui ne voient pas l'image

Pour trouver une adresse : fais un clic droit sur une image dans un site → « Copier l’adresse de l’image ».`,
    exemple: '<img src="https://picsum.photos/600/300" alt="Un joli paysage">',
    indices: [
      'Tape `<img src="" alt="">` puis colle l’adresse de ton image entre les premiers guillemets.',
      'Si l’image ne s’affiche pas, l’adresse n’est peut-être pas celle d’une image. Essaie celle de l’exemple pour vérifier.',
    ],
    memo: [
      {
        terme: 'Attribut',
        categorie: 'lexique',
        definition: 'Une info en plus dans une balise ouvrante, sous la forme nom="valeur".',
        exemple: '<img src="image.jpg" alt="Description">',
      },
      { terme: 'URL', categorie: 'lexique', definition: 'L’adresse d’une page ou d’un fichier sur internet. Elle commence par https://' },
      {
        terme: '<img>',
        categorie: 'balise',
        definition: 'Une image. src = son adresse, alt = sa description. Pas de balise fermante.',
        exemple: '<img src="https://picsum.photos/400/200" alt="Une photo">',
      },
    ],
    verifications: [
      { type: 'attribut', selecteur: 'img', attribut: 'src', motif: '^(https?:)?//|^data:image', label: 'Une image <img> avec une adresse src (https://…)' },
      { type: 'attribut', selecteur: 'img', attribut: 'alt', label: 'Une description dans l’attribut alt' },
      {
        type: 'script',
        label: 'L’image s’affiche bien',
        test: async (doc, outils) => {
          for (const img of doc.querySelectorAll('img[src]')) if (await outils.imageChargee(img)) return true;
          return false;
        },
      },
    ],
  },
  {
    id: 'html-7',
    module: 'html',
    titre: 'Un lien vers ailleurs',
    objectif: 'Ajoute un lien vers un site en rapport avec ton thème.',
    explication: `Le web, ce sont des pages reliées entre elles par des **liens**. La balise \`<a>\` crée un lien, et son attribut \`href\` contient l'adresse où aller.

Le texte entre \`<a>\` et \`</a>\` est ce sur quoi on clique.

Bonus : l'attribut \`target="_blank"\` ouvre le lien dans un nouvel onglet. (Dans l'aperçu, les liens ne s'ouvrent pas : tu pourras les tester sur ton site publié.)`,
    exemple: '<a href="https://fr.wikipedia.org/wiki/Jeu_vidéo" target="_blank">En savoir plus sur les jeux vidéo</a>',
    indices: ['La forme : `<a href="ADRESSE">texte à cliquer</a>`', 'Copie l’adresse d’un site dans la barre de ton navigateur et mets-la entre les guillemets de `href`.'],
    memo: [
      {
        terme: '<a>',
        categorie: 'balise',
        definition: 'Un lien. href = l’adresse de destination. target="_blank" = nouvel onglet.',
        exemple: '<a href="https://www.wikipedia.org" target="_blank">Wikipédia</a>',
      },
    ],
    verifications: [
      { type: 'attribut', selecteur: 'a', attribut: 'href', motif: '^https?://', label: 'Un lien <a> dont l’adresse href commence par http' },
      { type: 'element', selecteur: 'a[href]', texteMin: 1, label: 'Du texte cliquable dans le lien' },
    ],
  },
  {
    id: 'html-8',
    module: 'html',
    titre: 'Range ta page',
    objectif: 'Organise ta page en trois zones : en-tête, contenu et pied de page.',
    explication: `Les vrais sites rangent leur page en grandes zones :

- \`<header>\` : l'**en-tête**, tout en haut (avec ton titre)
- \`<main>\` : le **contenu principal**
- \`<footer>\` : le **pied de page**, tout en bas

Ces balises ne changent presque rien à l'affichage, mais elles organisent ton code. Et en CSS, elles vont servir à fond 😉

Astuce : décale ce qui est à l'intérieur avec la touche **Tab**. Ça s'appelle l'**indentation** : on voit tout de suite ce qui est dans quoi.`,
    exemple: '<header>\n  <h1>Le repaire des gamers</h1>\n</header>\n\n<main>\n  <!-- tout le reste de ta page ici -->\n</main>\n\n<footer>\n  <p>Site fait avec ❤️ à L’Atelier</p>\n</footer>',
    indices: [
      'Écris `<header>` juste avant ton `<h1>` et `</header>` juste après. Fais pareil avec `<main>` autour du reste.',
      'Le `<footer>` se met tout à la fin, après `</main>`, avec un petit `<p>` dedans.',
    ],
    memo: [
      {
        terme: '<header>, <main>, <footer>',
        categorie: 'balise',
        definition: 'Les trois grandes zones d’une page : en-tête, contenu principal, pied de page.',
        exemple: '<header>…</header>\n<main>…</main>\n<footer>…</footer>',
      },
      { terme: 'Indentation', categorie: 'lexique', definition: 'Décaler le code vers la droite (touche Tab) pour voir ce qui est à l’intérieur de quoi.' },
    ],
    verifications: [
      { type: 'element', selecteur: 'header h1', label: 'Ton titre <h1> est dans un <header>' },
      { type: 'element', selecteur: 'main', texteMin: 10, label: 'Un <main> qui contient ta page' },
      { type: 'element', selecteur: 'footer', texteMin: 1, label: 'Un <footer> avec du texte' },
    ],
  },

  // ==========================================================================
  //  MODULE CSS
  // ==========================================================================
  {
    id: 'css-1',
    module: 'css',
    titre: 'Change l’ambiance',
    objectif: 'Change la couleur du fond de ta page.',
    explication: `Le **CSS** donne du style à ta page : couleurs, tailles, positions… Il s'écrit dans l'onglet **CSS** de l'éditeur.

Une **règle** CSS ressemble à ça : \`body { background-color: navy; }\`

- \`body\` est le **sélecteur** : *à qui* on applique le style (ici, toute la page)
- \`background-color\` est la **propriété** : *ce qu'on* change (la couleur du fond)
- \`navy\` est la **valeur** : la nouvelle couleur

N'oublie pas les accolades \`{ }\`, les deux-points \`:\` et le point-virgule \`;\` à la fin !`,
    exemple: 'body {\n  background-color: #1e1b4b;\n}',
    indices: [
      'Clique sur l’onglet **CSS** en haut de l’éditeur. Écris `body { }`, puis entre les accolades : `background-color: ` suivi d’une couleur et d’un `;`',
      'Copie : `body { background-color: darkslateblue; }` puis essaie d’autres couleurs : `tomato`, `teal`, `black`…',
    ],
    memo: [
      { terme: 'CSS', categorie: 'lexique', definition: 'Le langage qui donne du style à la page : couleurs, tailles, positions…' },
      {
        terme: 'Règle CSS',
        categorie: 'lexique',
        definition: 'sélecteur { propriété: valeur; }',
        exemple: 'h1 {\n  color: red;\n}',
      },
      { terme: 'Sélecteur', categorie: 'lexique', definition: 'Dit à quels éléments s’applique une règle : h1, p, body…' },
      { terme: 'Propriété et valeur', categorie: 'lexique', definition: 'La propriété dit ce qu’on change (color), la valeur dit comment (red).' },
      {
        terme: 'background-color',
        categorie: 'propriete',
        definition: 'La couleur de fond d’un élément.',
        exemple: 'body {\n  background-color: #1e1b4b;\n}',
      },
    ],
    verifications: [
      { type: 'style', selecteur: 'body', propriete: ['background-color', 'background-image'], pasDefaut: true, label: 'Le fond de la page (body) a changé' },
    ],
  },
  {
    id: 'css-2',
    module: 'css',
    titre: 'Des couleurs qui pètent',
    objectif: 'Donne une couleur à ton titre et une autre au texte de tes paragraphes.',
    explication: `La propriété \`color\` change la couleur **du texte**. Une couleur peut s'écrire :

- avec un nom en anglais : \`tomato\`, \`gold\`, \`white\`, \`hotpink\`…
- avec un **code hexadécimal** : \`#ff6b6b\`. Un # suivi de 6 caractères (chiffres de 0 à 9 et lettres de a à f)

Choisis des couleurs qui se lisent bien sur ton fond !`,
    exemple: 'h1 {\n  color: gold;\n}\n\np {\n  color: white;\n}',
    indices: ['Écris une règle pour `h1` avec la propriété `color`, puis une autre pour `p`.', 'Copie l’exemple et change `gold` et `white` par tes couleurs.'],
    memo: [
      { terme: 'color', categorie: 'propriete', definition: 'La couleur du texte.', exemple: 'h1 {\n  color: gold;\n}' },
      {
        terme: 'Code couleur',
        categorie: 'lexique',
        definition: 'Une couleur s’écrit en anglais (red), en hexadécimal (#ff0000) ou en rgb(255, 0, 0).',
        exemple: '#ff6b6b',
      },
    ],
    verifications: [
      { type: 'style', selecteur: 'h1', propriete: 'color', pasDefaut: true, label: 'Ton titre h1 a une couleur' },
      { type: 'style', selecteur: 'p', propriete: 'color', pasDefaut: true, label: 'Tes paragraphes p ont une couleur' },
    ],
  },
  {
    id: 'css-3',
    module: 'css',
    titre: 'Ta police, ton style',
    objectif: 'Choisis une police pour toute la page et une grande taille pour ton titre.',
    explication: `- \`font-family\` choisit la **police** d'écriture
- \`font-size\` choisit la **taille** du texte

Une taille s'écrit avec une **unité** : \`px\` (pixels) ou \`rem\` (1rem = la taille normale du texte, 3rem = trois fois plus grand).

Polices disponibles partout : \`Arial\`, \`Verdana\`, \`Georgia\`, \`Impact\`, \`'Courier New'\`. Tu peux aussi donner une famille : \`sans-serif\`, \`serif\`, \`monospace\`.`,
    exemple: 'body {\n  font-family: Verdana, sans-serif;\n}\n\nh1 {\n  font-size: 3rem;\n}',
    indices: [
      'Tu peux ajouter des propriétés dans une règle qui existe déjà : mets `font-family: Verdana;` dans ta règle `body`.',
      'Dans ta règle `h1`, ajoute `font-size: 3rem;`',
    ],
    memo: [
      { terme: 'font-family', categorie: 'propriete', definition: 'La police d’écriture.', exemple: 'body {\n  font-family: Verdana, sans-serif;\n}' },
      { terme: 'font-size', categorie: 'propriete', definition: 'La taille du texte.', exemple: 'h1 {\n  font-size: 3rem;\n}' },
      { terme: 'Unité', categorie: 'lexique', definition: 'Ce qui suit un nombre en CSS : px (pixels), rem (taille du texte), % (pourcentage).' },
    ],
    verifications: [
      { type: 'style', selecteur: 'body', propriete: 'font-family', pasDefaut: true, label: 'Une police choisie pour la page (body)' },
      { type: 'style', selecteur: 'h1', propriete: 'font-size', pasDefaut: true, label: 'Une nouvelle taille pour ton titre h1' },
    ],
  },
  {
    id: 'css-4',
    module: 'css',
    titre: 'Fais des cartes',
    objectif: 'Donne une classe à un élément et transforme-le en jolie carte.',
    explication: `Et si tu veux styler **certains** éléments seulement ? Tu leur donnes une **classe** !

1. En HTML, ajoute l'attribut \`class\` : \`<section class="carte">\`
2. En CSS, le sélecteur d'une classe commence par un point : \`.carte { … }\`

Le nom, c'est toi qui le choisis (sans espace ni accent). Pour faire une carte :

- \`padding\` : l'espace **à l'intérieur**, entre le bord et le contenu
- \`border-radius\` : arrondit les coins
- \`background-color\` : le fond de la carte`,
    exemple: {
      html: '<section class="carte">\n  <h2>Mes jeux préférés</h2>\n  <p>Voici ceux auxquels je joue le plus.</p>\n</section>',
      css: '.carte {\n  background-color: #312e81;\n  padding: 20px;\n  border-radius: 16px;\n}',
    },
    indices: [
      'Dans l’onglet HTML, entoure un sous-titre et son paragraphe avec `<section class="carte">` et `</section>`.',
      'Dans l’onglet CSS, écris `.carte { }` (avec le point !) et ajoute `padding: 20px;` et `border-radius: 16px;`',
    ],
    memo: [
      {
        terme: 'Classe',
        categorie: 'lexique',
        definition: 'Un nom que tu donnes à des éléments (attribut class) pour leur appliquer un style en CSS.',
        exemple: '<section class="carte">…</section>',
      },
      { terme: '.classe', categorie: 'propriete', definition: 'Le sélecteur d’une classe commence par un point.', exemple: '.carte {\n  padding: 20px;\n}' },
      { terme: 'padding', categorie: 'propriete', definition: 'L’espace à l’intérieur d’un élément, entre son bord et son contenu.', exemple: '.carte {\n  padding: 20px;\n}' },
      { terme: 'border-radius', categorie: 'propriete', definition: 'Arrondit les coins.', exemple: '.carte {\n  border-radius: 16px;\n}' },
    ],
    verifications: [
      { type: 'element', selecteur: 'body [class]', label: 'Un élément HTML avec un attribut class' },
      { type: 'regleCss', contient: '.', label: 'Une règle CSS pour ta classe (avec un point : .carte)' },
      { type: 'style', selecteur: 'body [class]', propriete: ['padding-top', 'padding-left'], pasDefaut: true, label: 'De l’espace intérieur (padding)' },
      { type: 'style', selecteur: 'body [class]', propriete: 'border-top-left-radius', pasDefaut: true, label: 'Des coins arrondis (border-radius)' },
    ],
  },
  {
    id: 'css-5',
    module: 'css',
    titre: 'Centre ta page',
    objectif: 'Limite la largeur de ton contenu et centre-le au milieu de l’écran.',
    explication: `Sur un grand écran, ton texte s'étale sur toute la largeur : pas top à lire. La solution :

- \`max-width\` : la largeur **maximum** d'un élément
- \`margin\` : l'espace **autour** d'un élément (à l'extérieur, alors que \`padding\` est à l'intérieur)
- \`margin: 0 auto\` : 0 en haut et en bas, \`auto\` à gauche et à droite → l'élément se centre tout seul !`,
    exemple: 'main {\n  max-width: 800px;\n  margin: 0 auto;\n}',
    indices: ['Écris une règle pour `main` avec `max-width: 800px;`', 'Ajoute `margin: 0 auto;` dans la même règle.'],
    memo: [
      { terme: 'max-width', categorie: 'propriete', definition: 'La largeur maximum d’un élément.', exemple: 'main {\n  max-width: 800px;\n}' },
      {
        terme: 'margin',
        categorie: 'propriete',
        definition: 'L’espace autour d’un élément. « margin: 0 auto » le centre horizontalement.',
        exemple: 'main {\n  margin: 0 auto;\n}',
      },
    ],
    verifications: [
      { type: 'style', selecteur: 'body, body *', propriete: 'max-width', pasDefaut: true, label: 'Une largeur maximum (max-width)' },
      {
        type: 'script',
        label: 'Un élément centré avec margin: 0 auto',
        test: (doc) =>
          [...doc.querySelectorAll('body, body *')].some((el) => {
            const s = getComputedStyle(el);
            const gauche = parseFloat(s.marginLeft);
            return s.maxWidth !== 'none' && gauche > 0 && Math.abs(gauche - parseFloat(s.marginRight)) < 2;
          }),
      },
    ],
  },
  {
    id: 'css-6',
    module: 'css',
    titre: 'Effet au survol',
    objectif: 'Fais réagir un élément quand la souris passe dessus.',
    explication: `Rends ta page vivante : quand la souris passe sur un élément, son style change ! Il suffit d'ajouter \`:hover\` au sélecteur. C'est une **pseudo-classe** : elle décrit un *état* de l'élément (ici, « survolé »).

Pour que le changement soit tout doux, \`transition\` donne la durée de l'animation (en secondes : \`0.3s\`).

\`transform: scale(1.05)\` agrandit un élément de 5 %. Essaie aussi \`rotate(3deg)\` !`,
    exemple: '.carte {\n  transition: transform 0.3s;\n}\n\n.carte:hover {\n  transform: scale(1.05);\n}\n\na:hover {\n  color: hotpink;\n}',
    indices: [
      'Écris une nouvelle règle avec le même sélecteur suivi de `:hover`, par exemple `.carte:hover { }`. Mets-y un changement de couleur ou de taille.',
      'Dans la règle normale (sans `:hover`), ajoute `transition: all 0.3s;`',
    ],
    memo: [
      { terme: ':hover', categorie: 'propriete', definition: 'Le style quand la souris est sur l’élément.', exemple: 'a:hover {\n  color: hotpink;\n}' },
      { terme: 'transition', categorie: 'propriete', definition: 'Anime en douceur les changements de style.', exemple: '.carte {\n  transition: all 0.3s;\n}' },
      { terme: 'transform', categorie: 'propriete', definition: 'Agrandit (scale), tourne (rotate) ou déplace (translate) un élément.', exemple: '.carte:hover {\n  transform: scale(1.05) rotate(-1deg);\n}' },
    ],
    verifications: [
      { type: 'regleCss', contient: ':hover', label: 'Une règle avec :hover' },
      { type: 'regleCss', proprietes: ['transition'], label: 'Une transition pour adoucir l’effet' },
    ],
  },

  // ==========================================================================
  //  MODULE JAVASCRIPT
  // ==========================================================================
  {
    id: 'js-1',
    module: 'js',
    titre: 'Parle à la console',
    objectif: 'Affiche un message dans la console avec ton tout premier code JavaScript.',
    explication: `Le **JavaScript** (JS) rend ta page vivante : il réagit aux clics, change des textes, calcule…

Un programme est une suite d'**instructions** que l'ordinateur exécute dans l'ordre, de haut en bas.

Ta première instruction : \`console.log(…)\` affiche un message dans la **console**, sous l'aperçu. C'est l'outil n°1 des développeurs pour voir ce qui se passe.

Le texte se met entre guillemets : on appelle ça une **chaîne de caractères**.`,
    exemple: 'console.log("Salut ! Mon JS marche 🎉");',
    indices: ['Va dans l’onglet **JS** et écris `console.log("…");` avec ton message entre les guillemets.', 'Regarde sous l’aperçu : ton message apparaît dans la console.'],
    memo: [
      { terme: 'JavaScript', categorie: 'lexique', definition: 'Le langage qui rend une page interactive : réagir aux clics, modifier la page, calculer…' },
      { terme: 'Instruction', categorie: 'lexique', definition: 'Un ordre donné à l’ordinateur. Une par ligne, terminée par un point-virgule.' },
      { terme: 'Chaîne de caractères', categorie: 'lexique', definition: 'Du texte entre guillemets.', exemple: '"Bonjour !"' },
      { terme: 'console.log()', categorie: 'js', definition: 'Affiche un message dans la console. Super pour vérifier ce que fait ton code.', exemple: 'console.log("Coucou");' },
    ],
    verifications: [{ type: 'console', min: 1, label: 'Un message affiché dans la console' }],
  },
  {
    id: 'js-2',
    module: 'js',
    titre: 'Ton code modifie la page',
    objectif: 'Change le texte d’un élément de ta page avec du JavaScript.',
    explication: `Une **variable**, c'est une boîte avec un nom, dans laquelle on range une valeur. On la crée avec \`let\`.

\`document.querySelector("footer p")\` va chercher dans ta page le premier élément qui correspond au sélecteur, exactement comme en CSS !

On le range dans une variable, puis \`.textContent\` permet de **changer** son texte.`,
    exemple: 'let message = document.querySelector("footer p");\nmessage.textContent = "Ce texte a été écrit par mon code JS 😎";',
    indices: [
      'Ligne 1 : crée une variable avec `let` qui contient `document.querySelector("…")`. Entre les guillemets, mets un sélecteur d’un élément de ta page (`h1`, `footer p`…).',
      'Ligne 2 : écris le nom de ta variable, puis `.textContent = "ton nouveau texte";`',
    ],
    memo: [
      { terme: 'Variable', categorie: 'lexique', definition: 'Une boîte avec un nom qui contient une valeur. On la crée avec let (ou const si elle ne change jamais).', exemple: 'let score = 0;' },
      {
        terme: 'querySelector()',
        categorie: 'js',
        definition: 'Trouve le premier élément de la page qui correspond au sélecteur CSS.',
        exemple: 'let titre = document.querySelector("h1");',
      },
      { terme: '.textContent', categorie: 'js', definition: 'Le texte d’un élément. On peut le lire ou le changer.', exemple: 'titre.textContent = "Nouveau titre";' },
    ],
    verifications: [
      { type: 'script', label: 'Une variable créée avec let ou const', test: (doc, outils) => /\b(let|const|var)\s+[A-Za-z_$]/.test(outils.source.js) },
      {
        type: 'script',
        label: 'Un texte de ta page modifié par ton code',
        test: (doc, outils) => outils.texteVisible(doc) !== outils.texteVisible(outils.pageSansJs()),
      },
    ],
  },
  {
    id: 'js-3',
    module: 'js',
    titre: 'Un bouton qui réagit',
    objectif: 'Ajoute un bouton qui affiche un message quand on clique dessus.',
    explication: `Un **événement**, c'est quelque chose qui se passe dans la page : un clic, une touche du clavier…

Une **fonction**, c'est un bloc d'instructions qu'on range entre accolades \`{ }\` pour l'exécuter plus tard.

\`bouton.addEventListener("click", function () { … })\` veut dire : « quand on clique sur le bouton, exécute ces instructions ».

1. En HTML, ajoute un \`<button>\` et un paragraphe vide avec un **id** (un nom unique) : \`<p id="reponse"></p>\`
2. En JS, le sélecteur d'un id commence par \`#\` : \`"#reponse"\``,
    exemple: {
      html: '<button>Clique-moi</button>\n<p id="reponse"></p>',
      js: 'let bouton = document.querySelector("button");\nlet reponse = document.querySelector("#reponse");\n\nbouton.addEventListener("click", function () {\n  reponse.textContent = "Bien joué, tu as cliqué ! 🎉";\n});',
    },
    indices: [
      'D’abord le HTML : `<button>Clique-moi</button>` et `<p id="reponse"></p>`. Puis en JS, récupère les deux avec `querySelector`.',
      'Dans la fonction, mets la même ligne qu’à la mission précédente : `reponse.textContent = "…";`',
    ],
    memo: [
      { terme: '<button>', categorie: 'balise', definition: 'Un bouton cliquable.', exemple: '<button>Clique-moi</button>' },
      { terme: 'id', categorie: 'lexique', definition: 'Un attribut qui donne un nom unique à un élément. Son sélecteur commence par #.', exemple: '<p id="reponse"></p>' },
      { terme: 'Événement', categorie: 'lexique', definition: 'Quelque chose qui se passe dans la page : un clic (click), une touche (keydown)…' },
      { terme: 'Fonction', categorie: 'lexique', definition: 'Un bloc d’instructions entre { } qu’on exécute plus tard, par exemple lors d’un clic.' },
      {
        terme: 'addEventListener()',
        categorie: 'js',
        definition: 'Exécute une fonction quand un événement arrive sur un élément.',
        exemple: 'bouton.addEventListener("click", function () {\n  console.log("Clic !");\n});',
      },
    ],
    verifications: [
      { type: 'element', selecteur: 'button', label: 'Un bouton <button>' },
      { type: 'clic', selecteur: 'button', changement: 'dom', label: 'Un clic sur le bouton change la page' },
    ],
  },
  {
    id: 'js-4',
    module: 'js',
    titre: 'Change d’ambiance',
    objectif: 'Crée un bouton qui active ou désactive un thème pour ta page (mode sombre, mode fête…).',
    explication: `Le JS peut ajouter ou retirer une **classe** à un élément. Et comme ta classe a un style en CSS, le look change d'un coup !

\`element.classList.toggle("nom")\` ajoute la classe si elle n'y est pas, et l'enlève si elle y est. Comme un interrupteur 💡

\`document.body\` désigne directement le \`<body>\` de ta page.

Crée une classe \`.sombre\` (ou \`.fete\`, \`.neon\`… à toi de voir) en CSS, puis un bouton qui l'active sur le \`body\`.`,
    exemple: {
      html: '<button id="theme">Changer d’ambiance</button>',
      css: 'body.sombre {\n  background-color: black;\n  color: white;\n}',
      js: 'let boutonTheme = document.querySelector("#theme");\n\nboutonTheme.addEventListener("click", function () {\n  document.body.classList.toggle("sombre");\n});',
    },
    indices: [
      'Trois étapes : un bouton avec un id en HTML, une règle `body.sombre { }` en CSS, et en JS un `addEventListener` sur le bouton.',
      'Dans la fonction du clic : `document.body.classList.toggle("sombre");`',
    ],
    memo: [
      {
        terme: 'classList',
        categorie: 'js',
        definition: 'Ajoute (add), retire (remove) ou inverse (toggle) une classe sur un élément.',
        exemple: 'document.body.classList.toggle("sombre");',
      },
    ],
    verifications: [
      {
        type: 'script',
        label: 'Un clic sur un bouton change une classe ET le style',
        test: async (doc, outils) => {
          const classes = () => [...doc.querySelectorAll('*')].map((e) => e.getAttribute('class')).join('|');
          const styles = () =>
            [...doc.querySelectorAll('body, body *')]
              .map((e) => {
                const s = getComputedStyle(e);
                return s.backgroundColor + s.color + s.backgroundImage;
              })
              .join('|');
          for (const bouton of doc.querySelectorAll('button')) {
            const [c, s] = [classes(), styles()];
            await outils.cliquer(bouton);
            await outils.attendre(50);
            if (c !== classes() && s !== styles()) return true;
          }
          return false;
        },
      },
    ],
  },
  {
    id: 'js-5',
    module: 'js',
    titre: 'Compteur de likes',
    objectif: 'Crée un bouton ❤️ qui compte les clics et affiche le nombre.',
    explication: `Une variable peut **changer** de valeur !

\`compteur = compteur + 1\` veut dire : « prends la valeur actuelle de compteur, ajoute 1, et range le résultat dans la boîte ». Raccourci : \`compteur++\`.

Attention : la variable du compteur doit être créée **en dehors** de la fonction du clic. Sinon, elle repartirait de zéro à chaque clic !`,
    exemple: {
      html: '<button id="like">❤️ J’aime</button>\n<p>Likes : <span id="nombre">0</span></p>',
      js: 'let compteur = 0;\nlet boutonLike = document.querySelector("#like");\nlet affichage = document.querySelector("#nombre");\n\nboutonLike.addEventListener("click", function () {\n  compteur = compteur + 1;\n  affichage.textContent = compteur;\n});',
    },
    indices: [
      'Il te faut : un bouton, un endroit pour afficher le nombre (`<span id="nombre">0</span>`), et une variable `let compteur = 0;` au début du JS.',
      'Dans la fonction du clic : `compteur = compteur + 1;` puis `affichage.textContent = compteur;`',
    ],
    memo: [
      {
        terme: 'Augmenter une variable',
        categorie: 'js',
        definition: 'compteur = compteur + 1, ou en raccourci compteur++ (ou compteur += 5 pour ajouter 5).',
        exemple: 'compteur = compteur + 1;',
      },
      { terme: '<span>', categorie: 'balise', definition: 'Un petit morceau de texte, pratique pour le cibler en CSS ou en JS.', exemple: '<span id="nombre">0</span>' },
    ],
    verifications: [
      {
        type: 'script',
        label: 'Une variable qui augmente (compteur = compteur + 1)',
        test: (doc, outils) => /([A-Za-z_$][\w$]*)\s*(\+\+|\+=|=\s*\1\s*\+)/.test(outils.source.js),
      },
      {
        type: 'script',
        label: 'Le nombre affiché augmente à chaque clic',
        test: async (doc, outils) => {
          const somme = () => (doc.body.innerText.match(/\d+/g) || []).map(Number).reduce((a, b) => a + b, 0);
          for (const bouton of doc.querySelectorAll('button')) {
            const avant = somme();
            await outils.cliquer(bouton, 3);
            if (somme() - avant >= 3) return true;
          }
          return false;
        },
      },
    ],
  },
];
