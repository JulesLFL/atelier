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
//    bonus: true                   (facultatif) défi bonus ⭐ : ne bloque pas la suite, s'ouvre quand
//                                  toutes les missions obligatoires du module sont réussies
//  }
//
//  LE QUIZ D'ÉCHAUFFEMENT : tout en bas du fichier (export const quiz), des questions rangées
//  par mission. On ne pose que des questions sur des missions déjà réussies.
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

  {
    id: 'html-9',
    module: 'html',
    titre: 'Un formulaire de contact',
    objectif: 'Ajoute un formulaire avec des champs, chacun avec son étiquette, et un bouton Envoyer.',
    explication: `Un **formulaire** permet au visiteur d'écrire quelque chose. Il se construit avec :

- \`<form>\` qui entoure tout le formulaire
- \`<input>\` pour une ligne de texte, \`<textarea>\` pour un long texte
- \`<label>\` : l'**étiquette** du champ (« Ton pseudo », « Ton message »…)
- \`<button type="submit">\` pour envoyer

Le \`<label>\` est relié à son champ : son attribut \`for\` contient l'\`id\` du champ. Comme ça, cliquer sur l'étiquette place le curseur dans le champ, et les personnes aveugles entendent à quoi sert chaque case.

(Pour vraiment envoyer un message, il faudrait un serveur : ici, on apprend la structure.)`,
    exemple: '<form>\n  <label for="pseudo">Ton pseudo</label>\n  <input id="pseudo" type="text">\n\n  <label for="message">Ton message</label>\n  <textarea id="message"></textarea>\n\n  <button type="submit">Envoyer</button>\n</form>',
    indices: [
      'Commence par `<form>` et `</form>`, puis ajoute dedans un `<label>` suivi de son `<input>`.',
      'Le `for` du label doit être exactement l’`id` du champ : `<label for="pseudo">` va avec `<input id="pseudo">`.',
    ],
    memo: [
      { terme: '<form>', categorie: 'balise', definition: 'Un formulaire : il regroupe des champs et un bouton pour envoyer.', exemple: '<form>\n  …\n  <button type="submit">Envoyer</button>\n</form>' },
      { terme: '<label>', categorie: 'balise', definition: 'L’étiquette d’un champ. Son attribut for = l’id du champ.', exemple: '<label for="pseudo">Ton pseudo</label>\n<input id="pseudo">' },
      { terme: '<textarea>', categorie: 'balise', definition: 'Une grande zone de texte sur plusieurs lignes.', exemple: '<textarea id="message"></textarea>' },
    ],
    verifications: [
      { type: 'element', selecteur: 'form', label: 'Un formulaire <form>' },
      { type: 'element', selecteur: 'form input, form textarea', label: 'Au moins un champ (<input> ou <textarea>)' },
      {
        type: 'script',
        label: 'Chaque champ a son étiquette <label>',
        test: (doc) => {
          const champs = [...doc.querySelectorAll('form input:not([type=hidden]):not([type=submit]):not([type=button]), form textarea, form select')];
          return champs.length > 0 && champs.every((c) => (c.id && doc.querySelector(`label[for="${CSS.escape(c.id)}"]`)) || c.closest('label'));
        },
      },
      { type: 'element', selecteur: 'form button', texteMin: 1, label: 'Un bouton pour envoyer' },
    ],
  },
  {
    id: 'html-10',
    module: 'html',
    titre: 'Des images légendées',
    objectif: 'Ajoute une image avec une légende en dessous.',
    explication: `Pour mettre une **légende** sous une image, on range les deux dans une \`<figure>\` :

- \`<figure>\` entoure l'image et sa légende
- \`<figcaption>\` contient la légende

C'est mieux qu'un simple paragraphe en dessous : le navigateur sait que la légende décrit cette image-là.`,
    exemple: '<figure>\n  <img src="https://picsum.photos/500/280" alt="Une manette de jeu">\n  <figcaption>Ma manette, après 300 heures de jeu.</figcaption>\n</figure>',
    indices: ['Entoure une de tes images (ou une nouvelle) avec `<figure>` et `</figure>`.', 'Juste après l’image, ajoute `<figcaption>Ta légende</figcaption>`.'],
    memo: [{ terme: '<figure> et <figcaption>', categorie: 'balise', definition: 'Une image (ou autre illustration) avec sa légende.', exemple: '<figure>\n  <img src="…" alt="…">\n  <figcaption>La légende</figcaption>\n</figure>' }],
    verifications: [
      { type: 'element', selecteur: 'figure img', label: 'Une image dans une <figure>' },
      { type: 'element', selecteur: 'figure figcaption', texteMin: 2, label: 'Une légende <figcaption>' },
    ],
  },
  {
    id: 'html-11',
    module: 'html',
    titre: 'Des titres bien rangés',
    objectif: 'Ajoute un sous-sous-titre <h3>, avec un seul <h1> et des titres qui ne sautent pas de niveau.',
    explication: `Les titres forment le **plan** de ta page, comme dans un livre : un seul titre principal \`<h1>\`, des chapitres \`<h2>\`, et des sous-parties \`<h3>\` dans un chapitre.

Les personnes aveugles utilisent un logiciel qui lit la page à voix haute : il permet de **sauter de titre en titre**. Si les niveaux sont dans le désordre, elles se perdent. Faire un site utilisable par tout le monde, ça s'appelle l'**accessibilité**.

Les règles : un seul \`<h1>\`, et on ne saute pas de niveau (pas de \`<h3>\` juste après un \`<h1>\`, sans \`<h2>\` entre les deux).`,
    exemple: '<h2>Mes jeux préférés</h2>\n<h3>Sur console</h3>\n<p>…</p>\n<h3>Sur PC</h3>\n<p>…</p>',
    indices: ['Ajoute un `<h3>` juste sous un de tes `<h2>`, pour faire une sous-partie.', 'Si tu as deux `<h1>`, transforme le second en `<h2>`.'],
    memo: [{ terme: 'Accessibilité', categorie: 'lexique', definition: 'Faire un site utilisable par tout le monde, y compris les personnes aveugles, malvoyantes ou qui n’utilisent pas de souris.' }],
    verifications: [
      { type: 'element', selecteur: 'h1', min: 1, max: 1, label: 'Un seul titre <h1>' },
      { type: 'element', selecteur: 'h3', texteMin: 2, label: 'Au moins un sous-sous-titre <h3>' },
      {
        type: 'script',
        label: 'Les titres ne sautent pas de niveau',
        test: (doc) => {
          let precedent = 0;
          for (const t of doc.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
            const niveau = Number(t.tagName[1]);
            if (niveau > precedent + 1) return false;
            precedent = niveau;
          }
          return precedent > 0;
        },
      },
    ],
  },

  // --- Défis bonus HTML ⭐ -------------------------------------------------------
  {
    id: 'html-bonus-1',
    module: 'html',
    bonus: true,
    titre: 'Un tableau de scores',
    objectif: 'Ajoute un tableau (classement, records, stats…) avec au moins 3 lignes.',
    explication: `Un tableau se construit ligne par ligne :

- \`<table>\` entoure tout le tableau
- \`<tr>\` crée une ligne (*table row*)
- \`<th>\` est une case de titre (en gras), \`<td>\` une case normale

Chaque ligne doit avoir le même nombre de cases. Mets une ligne de titres, puis au moins deux lignes de données.`,
    exemple: '<table>\n  <tr>\n    <th>Joueur</th>\n    <th>Score</th>\n  </tr>\n  <tr>\n    <td>Alex</td>\n    <td>1200</td>\n  </tr>\n  <tr>\n    <td>Sam</td>\n    <td>950</td>\n  </tr>\n</table>',
    indices: ['Commence par la ligne de titres : `<tr><th>Nom</th><th>Score</th></tr>` à l’intérieur de `<table>`.', 'Copie l’exemple et change les noms et les nombres.'],
    memo: [
      {
        terme: '<table>, <tr>, <th>, <td>',
        categorie: 'balise',
        definition: 'Un tableau : table = le tableau, tr = une ligne, th = une case titre, td = une case.',
        exemple: '<table>\n  <tr><th>Nom</th><th>Score</th></tr>\n  <tr><td>Alex</td><td>12</td></tr>\n</table>',
      },
    ],
    verifications: [
      { type: 'element', selecteur: 'table', label: 'Un tableau <table>' },
      { type: 'element', selecteur: 'table th', texteMin: 1, label: 'Au moins une case de titre <th>' },
      { type: 'element', selecteur: 'table tr', min: 3, label: 'Au moins 3 lignes <tr>' },
      { type: 'element', selecteur: 'table td', min: 4, texteMin: 1, label: 'Au moins 4 cases <td> remplies' },
    ],
  },
  {
    id: 'html-bonus-2',
    module: 'html',
    bonus: true,
    titre: 'Un sommaire cliquable',
    objectif: 'Crée un lien qui fait sauter directement à une partie de ta page.',
    explication: `Un lien peut mener à un endroit **de la même page** !

1. Donne un **id** (un nom unique) à l'élément d'arrivée : \`<h2 id="astuces">Mes astuces</h2>\`
2. Fais un lien vers cet id, avec un \`#\` devant : \`<a href="#astuces">Voir mes astuces</a>\`

Les longues pages utilisent ça pour leur sommaire. Clique sur ton lien dans l'aperçu pour tester (ajoute du texte pour que la page défile).`,
    exemple: '<a href="#astuces">Aller à mes astuces</a>\n\n<h2 id="astuces">Mes astuces</h2>',
    indices: ['Ajoute `id="astuces"` dans la balise ouvrante d’un de tes `<h2>`.', 'Puis le lien : `<a href="#astuces">Mes astuces</a>`. Le texte après le `#` doit être exactement l’id.'],
    memo: [
      {
        terme: 'Lien vers une ancre',
        categorie: 'balise',
        definition: 'Un lien href="#nom" fait défiler la page jusqu’à l’élément qui a id="nom".',
        exemple: '<a href="#contact">Contact</a>\n…\n<h2 id="contact">Contact</h2>',
      },
    ],
    verifications: [
      { type: 'attribut', selecteur: 'a', attribut: 'href', motif: '^#.+', label: 'Un lien dont l’adresse commence par #' },
      {
        type: 'script',
        label: 'Le lien mène bien à un élément qui a cet id',
        test: (doc) =>
          [...doc.querySelectorAll('a[href^="#"]')].some((a) => {
            const id = decodeURIComponent(a.getAttribute('href').slice(1));
            return id && doc.getElementById(id) !== null;
          }),
      },
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

  {
    id: 'css-7',
    module: 'css',
    titre: 'Tes couleurs en variables',
    objectif: 'Range tes couleurs dans des variables CSS et utilise-les au moins deux fois.',
    explication: `Tu utilises la même couleur à plusieurs endroits ? Range-la dans une **variable** ! Si tu changes d'avis, tu la modifies à un seul endroit.

- On déclare les variables dans \`:root\` (c'est toute la page), avec un nom qui commence par deux tirets : \`--principale: gold;\`
- On les utilise avec \`var(…)\` : \`color: var(--principale);\`

C'est comme les variables en JavaScript, mais pour le CSS.`,
    exemple: ':root {\n  --principale: gold;\n  --fond: #1e1b4b;\n}\n\nbody {\n  background-color: var(--fond);\n}\n\nh1 {\n  color: var(--principale);\n}',
    indices: ['Tout en haut de ton CSS : `:root { --principale: gold; }`', 'Ensuite, remplace une couleur par `var(--principale)` dans deux règles différentes.'],
    memo: [{ terme: 'Variables CSS', categorie: 'propriete', definition: 'Déclarées dans :root avec --nom, utilisées avec var(--nom).', exemple: ':root {\n  --principale: gold;\n}\nh1 {\n  color: var(--principale);\n}' }],
    verifications: [
      { type: 'script', label: 'Des variables déclarées dans :root', test: (doc, outils) => /:root\s*\{[^}]*--[\w-]+\s*:/.test(outils.source.css) },
      { type: 'script', label: 'Utilisées au moins 2 fois avec var(…)', test: (doc, outils) => (outils.source.css.match(/var\(\s*--[\w-]+/g) || []).length >= 2 },
    ],
  },
  {
    id: 'css-8',
    module: 'css',
    titre: 'Ton site sur téléphone',
    objectif: 'Ajoute une règle qui ne s’applique que sur les petits écrans.',
    explication: `Ton site sera aussi regardé sur des téléphones, où l'écran est étroit. Avec \`@media\`, tu écris des règles qui ne s'appliquent **que sur les petits écrans** :

\`@media (max-width: 600px) { … }\` veut dire : « seulement si l'écran fait 600 pixels de large ou moins ».

Par exemple, un titre un peu moins énorme, ou moins de marges. Clique sur le bouton 📱 au-dessus de l'aperçu pour voir le résultat !`,
    exemple: '@media (max-width: 600px) {\n  h1 {\n    font-size: 2rem;\n  }\n\n  .carte {\n    padding: 12px;\n  }\n}',
    indices: ['Tout en bas de ton CSS, écris `@media (max-width: 600px) { }`.', 'À l’intérieur des accolades, mets une règle normale, par exemple `h1 { font-size: 2rem; }`.'],
    memo: [{ terme: '@media', categorie: 'propriete', definition: 'Des règles qui ne s’appliquent que sous certaines conditions, par exemple sur les petits écrans.', exemple: '@media (max-width: 600px) {\n  h1 {\n    font-size: 2rem;\n  }\n}' }],
    verifications: [
      {
        type: 'script',
        label: 'Une règle @media (max-width: …) avec du style dedans',
        test: (doc) => {
          const feuille = doc.getElementById('atelier-css')?.sheet;
          return [...(feuille?.cssRules || [])].some((r) => r.media && /max-width/.test(r.media.mediaText) && r.cssRules.length > 0);
        },
      },
    ],
  },
  {
    id: 'css-9',
    module: 'css',
    titre: 'Ça bouge !',
    objectif: 'Crée une animation avec @keyframes et applique-la à un élément.',
    explication: `Une **animation** CSS se fait en deux temps :

1. Tu décris le mouvement avec \`@keyframes\` : à quoi ressemble l'élément au début (\`from\`) et à la fin (\`to\`)
2. Tu l'appliques avec la propriété \`animation\` : le nom, la durée, et \`infinite\` pour qu'elle tourne en boucle

Petit conseil de pro : une animation doit rester discrète. Trop de mouvement, ça fatigue (et ça gêne certaines personnes).`,
    exemple: '@keyframes flotte {\n  from {\n    transform: translateY(0);\n  }\n  to {\n    transform: translateY(-8px);\n  }\n}\n\nh1 {\n  animation: flotte 1.5s ease-in-out infinite alternate;\n}',
    indices: ['D’abord `@keyframes monAnimation { from { … } to { … } }`, avec par exemple un `transform` différent dans chaque partie.', 'Puis, dans la règle d’un élément : `animation: monAnimation 2s infinite;`'],
    memo: [
      { terme: '@keyframes', categorie: 'propriete', definition: 'Décrit une animation : l’état de départ (from) et d’arrivée (to).', exemple: '@keyframes flotte {\n  from { transform: translateY(0); }\n  to { transform: translateY(-8px); }\n}' },
      { terme: 'animation', categorie: 'propriete', definition: 'Applique une animation : nom, durée, répétition.', exemple: 'h1 {\n  animation: flotte 2s infinite alternate;\n}' },
    ],
    verifications: [
      { type: 'script', label: 'Une animation décrite avec @keyframes', test: (doc) => [...(doc.getElementById('atelier-css')?.sheet?.cssRules || [])].some((r) => r.type === 7 || r.constructor?.name === 'CSSKeyframesRule') },
      { type: 'regleCss', proprietes: ['animation'], label: 'Un élément qui utilise la propriété animation' },
    ],
  },

  // --- Défis bonus CSS ⭐ --------------------------------------------------------
  {
    id: 'css-bonus-1',
    module: 'css',
    bonus: true,
    titre: 'Une galerie en ligne',
    objectif: 'Range des éléments côte à côte avec display: flex et de l’espace entre eux.',
    explication: `Par défaut, les blocs s'empilent les uns sous les autres. Avec **flexbox**, on les range côte à côte !

- \`display: flex\` sur le **parent** (l'élément qui contient les autres)
- \`gap\` : l'espace entre les éléments
- \`flex-wrap: wrap\` : passe à la ligne s'il n'y a plus de place

Parfait pour une galerie d'images ou des cartes alignées.`,
    exemple: {
      html: '<div class="galerie">\n  <img src="https://picsum.photos/200/150?1" alt="Photo 1">\n  <img src="https://picsum.photos/200/150?2" alt="Photo 2">\n  <img src="https://picsum.photos/200/150?3" alt="Photo 3">\n</div>',
      css: '.galerie {\n  display: flex;\n  gap: 16px;\n  flex-wrap: wrap;\n}',
    },
    indices: ['Mets tes éléments dans un même parent (par exemple `<div class="galerie">…</div>`).', 'En CSS : `.galerie { display: flex; gap: 16px; }`'],
    memo: [
      { terme: 'gap', categorie: 'propriete', definition: 'L’espace entre les éléments d’un conteneur flex (ou grid).', exemple: '.galerie {\n  gap: 16px;\n}' },
      { terme: 'flex-wrap', categorie: 'propriete', definition: 'wrap : les éléments passent à la ligne quand il n’y a plus de place.', exemple: '.galerie {\n  flex-wrap: wrap;\n}' },
    ],
    verifications: [
      { type: 'style', selecteur: 'body, body *', propriete: 'display', egal: 'flex', label: 'Un conteneur en display: flex' },
      {
        type: 'script',
        label: 'Au moins 2 éléments dedans, avec de l’espace (gap)',
        test: (doc) =>
          [...doc.querySelectorAll('body, body *')].some((el) => {
            const s = getComputedStyle(el);
            const espace = parseFloat(s.columnGap) > 0 || parseFloat(s.rowGap) > 0;
            return s.display === 'flex' && el.children.length >= 2 && espace;
          }),
      },
    ],
  },
  {
    id: 'css-bonus-2',
    module: 'css',
    bonus: true,
    titre: 'Ombres et dégradés',
    objectif: 'Ajoute un dégradé de couleurs et une ombre à des éléments de ta page.',
    explication: `Deux effets qui donnent tout de suite un look pro :

- \`background: linear-gradient(direction, couleur1, couleur2)\` : un **dégradé**. La direction peut être \`to right\`, \`to bottom\` ou un angle comme \`135deg\`.
- \`box-shadow: x y flou couleur\` : une **ombre**. Par exemple \`0 8px 20px rgba(0, 0, 0, 0.4)\`.

\`rgba\` est une couleur avec de la transparence : le dernier nombre va de 0 (invisible) à 1 (opaque).`,
    exemple: 'body {\n  background: linear-gradient(135deg, #1e1b4b, #7c3aed);\n}\n\n.carte {\n  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);\n}',
    indices: ['Pour le dégradé, remplace ton `background-color` du body par `background: linear-gradient(135deg, couleur1, couleur2);`', 'Pour l’ombre, ajoute `box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);` dans la règle de tes cartes.'],
    memo: [
      { terme: 'box-shadow', categorie: 'propriete', definition: 'Une ombre : décalage x, décalage y, flou, couleur.', exemple: '.carte {\n  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);\n}' },
      { terme: 'rgba()', categorie: 'lexique', definition: 'Une couleur avec transparence : rouge, vert, bleu (0 à 255) et opacité (0 à 1).', exemple: 'rgba(0, 0, 0, 0.4)' },
    ],
    verifications: [
      { type: 'style', selecteur: 'body, body *', propriete: 'background-image', contient: 'gradient', label: 'Un dégradé (linear-gradient)' },
      { type: 'style', selecteur: 'body, body *', propriete: 'box-shadow', pasDefaut: true, label: 'Une ombre (box-shadow)' },
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

  {
    id: 'js-6',
    module: 'js',
    titre: 'La réponse cachée',
    objectif: 'Crée une question dont la réponse est cachée, et un bouton pour l’afficher.',
    explication: `L'attribut \`hidden\` cache un élément : \`<p id="reponse" hidden>…</p>\`.

En JavaScript, \`element.hidden\` vaut \`true\` (caché) ou \`false\` (visible). Et le point d'exclamation \`!\` veut dire « le contraire » : \`!true\` vaut \`false\`.

Donc \`reponse.hidden = !reponse.hidden\` inverse l'état à chaque clic : caché, visible, caché…

Parfait pour une FAQ, une devinette ou un spoiler !`,
    exemple: {
      html: '<p>Quel est le jeu le plus vendu de tous les temps ?</p>\n<button id="voir">Voir la réponse</button>\n<p id="reponse" hidden>Minecraft !</p>',
      js: 'let boutonVoir = document.querySelector("#voir");\nlet reponse = document.querySelector("#reponse");\n\nboutonVoir.addEventListener("click", function () {\n  reponse.hidden = !reponse.hidden;\n});',
    },
    indices: ['En HTML, ajoute `hidden` dans la balise ouvrante de la réponse : `<p id="reponse" hidden>`.', 'Dans la fonction du clic : `reponse.hidden = !reponse.hidden;`'],
    memo: [{ terme: '! (le contraire)', categorie: 'js', definition: 'Inverse une valeur vrai/faux : !true vaut false.', exemple: 'element.hidden = !element.hidden;' }],
    verifications: [
      { type: 'script', label: 'Un élément caché avec l’attribut hidden', test: (doc, outils) => outils.pageSansJs().querySelector('body [hidden]') !== null },
      {
        type: 'script',
        label: 'Un clic sur un bouton l’affiche',
        test: async (doc, outils) => {
          const etat = () => [...doc.querySelectorAll('body *')].map((e) => e.hidden).join('');
          for (const bouton of doc.querySelectorAll('button')) {
            const avant = etat();
            await outils.cliquer(bouton);
            if (etat() !== avant) return true;
          }
          return false;
        },
      },
    ],
  },
  {
    id: 'js-7',
    module: 'js',
    titre: 'Bonjour ou bonsoir ?',
    objectif: 'Affiche un message différent selon l’heure, avec une condition.',
    explication: `Une **condition** permet à ton programme de choisir : « **si** quelque chose est vrai, fais ceci, **sinon** fais cela ». Elle s'écrit \`if (condition) { … } else { … }\`.

\`new Date().getHours()\` donne l'heure actuelle (de 0 à 23). Pour comparer, on utilise \`<\` (plus petit que), \`>\` (plus grand que) ou \`===\` (égal à).`,
    exemple: {
      html: '<p id="salut"></p>',
      js: 'let heure = new Date().getHours();\nlet salut = document.querySelector("#salut");\n\nif (heure < 18) {\n  salut.textContent = "Bonjour ☀️ et bienvenue !";\n} else {\n  salut.textContent = "Bonsoir 🌙 et bienvenue !";\n}',
    },
    indices: ['Récupère l’heure : `let heure = new Date().getHours();`', 'Puis `if (heure < 18) { … } else { … }`, avec un `textContent` différent dans chaque partie.'],
    memo: [
      { terme: 'Comparaisons', categorie: 'js', definition: '< plus petit, > plus grand, === égal, !== différent.', exemple: 'if (score === 10) {\n  console.log("Parfait !");\n}' },
      { terme: 'L’heure actuelle', categorie: 'js', definition: 'new Date().getHours() donne l’heure de 0 à 23.', exemple: 'let heure = new Date().getHours();' },
    ],
    verifications: [
      { type: 'script', label: 'Une condition if… else', test: (doc, outils) => /\bif\s*\(/.test(outils.source.js) && /\belse\b/.test(outils.source.js) },
      { type: 'script', label: 'Un texte affiché par ton code', test: (doc, outils) => outils.texteVisible(doc) !== outils.texteVisible(outils.pageSansJs()) },
    ],
  },
  {
    id: 'js-8',
    module: 'js',
    titre: 'Une liste qui se remplit toute seule',
    objectif: 'Crée une liste à partir d’un tableau, grâce à une boucle.',
    explication: `Une **boucle** répète des instructions. La boucle \`for … of\` les répète **pour chaque élément d'un tableau** :

\`for (let jeu of jeux) { … }\` veut dire : « pour chaque jeu de la liste des jeux, fais … ».

Pour ajouter un élément dans la page :

- \`document.createElement("li")\` fabrique un nouvel élément
- \`.textContent\` lui donne son texte
- \`liste.append(li)\` l'ajoute dans la liste

Ajoute un jeu dans le tableau : il apparaît tout seul dans la page !`,
    exemple: {
      html: '<ul id="mes-jeux"></ul>',
      js: 'let jeux = ["Minecraft", "Zelda", "Celeste", "Rocket League"];\nlet liste = document.querySelector("#mes-jeux");\n\nfor (let jeu of jeux) {\n  let li = document.createElement("li");\n  li.textContent = jeu;\n  liste.append(li);\n}',
    },
    indices: ['En HTML, une liste vide : `<ul id="mes-jeux"></ul>`. En JS, un tableau d’au moins 3 textes.', 'Dans la boucle : `let li = document.createElement("li");` puis `li.textContent = jeu;` puis `liste.append(li);`'],
    memo: [
      { terme: 'Boucle for … of', categorie: 'js', definition: 'Répète des instructions pour chaque élément d’un tableau.', exemple: 'for (let jeu of jeux) {\n  console.log(jeu);\n}' },
      { terme: 'createElement / append', categorie: 'js', definition: 'Fabrique un nouvel élément, puis l’ajoute dans la page.', exemple: 'let li = document.createElement("li");\nli.textContent = "Nouveau";\nliste.append(li);' },
    ],
    verifications: [
      { type: 'script', label: 'Une boucle for', test: (doc, outils) => /\bfor\s*\(/.test(outils.source.js) },
      {
        type: 'script',
        label: 'Au moins 3 éléments ajoutés à la page par ta boucle',
        test: (doc, outils) => doc.querySelectorAll('li').length - outils.pageSansJs().querySelectorAll('li').length >= 3,
      },
    ],
  },

  // --- Défis bonus JS ⭐ -----------------------------------------------------------
  {
    id: 'js-bonus-1',
    module: 'js',
    bonus: true,
    titre: 'Blague au hasard',
    objectif: 'Un bouton qui affiche une blague (ou une citation, un conseil…) tirée au hasard.',
    explication: `Un **tableau** (en anglais *array*) est une liste de valeurs entre crochets : \`["un", "deux", "trois"]\`. Chaque valeur a une position, en commençant à **0**.

\`Math.random()\` donne un nombre au hasard entre 0 et 1. Multiplié par la longueur de la liste puis arrondi à l'entier inférieur avec \`Math.floor\`, il donne une position au hasard !`,
    exemple: {
      html: '<button id="blague">😂 Une blague !</button>\n<p id="texte-blague"></p>',
      js: 'let blagues = [\n  "Pourquoi les plongeurs plongent-ils en arrière ? Sinon ils tombent dans le bateau.",\n  "Que dit un informaticien quand il s’ennuie ? Je me fichier.",\n  "Quel est le comble pour un joueur de bowling ? Perdre la boule."\n];\nlet boutonBlague = document.querySelector("#blague");\nlet texteBlague = document.querySelector("#texte-blague");\n\nboutonBlague.addEventListener("click", function () {\n  let position = Math.floor(Math.random() * blagues.length);\n  texteBlague.textContent = blagues[position];\n});',
    },
    indices: ['Crée d’abord le tableau : `let blagues = ["…", "…", "…"];` avec au moins 3 textes.', 'Dans la fonction du clic : `let position = Math.floor(Math.random() * blagues.length);` puis affiche `blagues[position]`.'],
    memo: [
      { terme: 'Tableau', categorie: 'lexique', definition: 'Une liste de valeurs entre crochets. La première est à la position 0.', exemple: 'let fruits = ["pomme", "kiwi"];\nconsole.log(fruits[0]); // pomme' },
      { terme: 'Math.random()', categorie: 'js', definition: 'Un nombre au hasard entre 0 et 1. Avec Math.floor, on obtient une position au hasard.', exemple: 'let position = Math.floor(Math.random() * liste.length);' },
    ],
    verifications: [
      { type: 'script', label: 'Un tableau et Math.random() dans ton JS', test: (doc, outils) => /\[[^\]]*["'`][^\]]*,/.test(outils.source.js) && /Math\.random\(\)/.test(outils.source.js) },
      {
        type: 'script',
        label: 'Le texte change au hasard quand on clique',
        test: async (doc, outils) => {
          for (const bouton of doc.querySelectorAll('button')) {
            const vus = new Set();
            for (let i = 0; i < 12; i++) {
              await outils.cliquer(bouton);
              vus.add(outils.texteVisible(doc));
            }
            if (vus.size >= 2) return true;
          }
          return false;
        },
      },
    ],
  },
  {
    id: 'js-bonus-2',
    module: 'js',
    bonus: true,
    titre: 'Le message secret',
    objectif: 'Une zone de texte et un bouton : quand on clique, la page affiche ce qu’on a écrit.',
    explication: `\`<input>\` crée une **zone de saisie** : le visiteur peut y écrire. Pas de balise fermante.

En JS, \`.value\` donne ce qui est écrit dedans. On peut s'en servir pour afficher un message personnalisé, par exemple « Salut Sam ! ».

Pour coller du texte et une variable, on utilise \`+\` : \`"Salut " + prenom + " !"\`. Ça s'appelle une **concaténation**.`,
    exemple: {
      html: '<input id="prenom" placeholder="Ton prénom">\n<button id="valider">Valider</button>\n<p id="bonjour"></p>',
      js: 'let champ = document.querySelector("#prenom");\nlet boutonValider = document.querySelector("#valider");\nlet bonjour = document.querySelector("#bonjour");\n\nboutonValider.addEventListener("click", function () {\n  bonjour.textContent = "Salut " + champ.value + " ! 👋";\n});',
    },
    indices: ['En HTML : un `<input id="prenom">`, un bouton et un paragraphe vide avec un id.', 'Dans la fonction du clic : `bonjour.textContent = "Salut " + champ.value;`'],
    memo: [
      { terme: '<input>', categorie: 'balise', definition: 'Une zone où le visiteur peut écrire. placeholder = texte d’aide en gris.', exemple: '<input id="prenom" placeholder="Ton prénom">' },
      { terme: '.value', categorie: 'js', definition: 'Le texte écrit dans un <input>.', exemple: 'let texte = champ.value;' },
      { terme: 'Concaténation', categorie: 'lexique', definition: 'Coller des textes avec +.', exemple: '"Salut " + prenom + " !"' },
    ],
    verifications: [
      { type: 'element', selecteur: 'input', label: 'Une zone de saisie <input>' },
      {
        type: 'script',
        label: 'Ce qu’on écrit s’affiche dans la page après un clic',
        test: async (doc, outils) => {
          const secret = 'Atelier' + Math.floor(Math.random() * 1000);
          for (const champ of doc.querySelectorAll('input:not([type]), input[type="text"], input[type="search"]')) {
            champ.value = secret;
            champ.dispatchEvent(new Event('input', { bubbles: true }));
            for (const bouton of doc.querySelectorAll('button')) {
              await outils.cliquer(bouton);
              if (outils.texteVisible(doc).includes(secret)) return true;
            }
          }
          return false;
        },
      },
    ],
  },
];

// ============================================================================
//  QUIZ D'ÉCHAUFFEMENT
//  Au début d'une séance, l'élève reçoit 3 questions tirées au hasard parmi celles
//  des missions qu'il a déjà réussies. Format :
//    { question: '…', choix: ['…', '…', '…'], reponse: 0, explication: '…' }
//  « reponse » est la position de la bonne réponse dans « choix » (0 = la première).
//  Les réponses ne sont jamais envoyées au navigateur avant que l'élève ait répondu.
// ============================================================================
export const quiz = {
  'html-1': [
    { question: 'Quelle balise sert au titre principal d’une page ?', choix: ['<title>', '<h1>', '<head>'], reponse: 1, explication: '<h1> est le grand titre visible. <title> est le nom affiché dans l’onglet du navigateur.' },
    { question: 'Comment ferme-t-on la balise <h1> ?', choix: ['</h1>', '<h1/>', '<\\h1>'], reponse: 0, explication: 'Une balise fermante a une barre oblique / juste après le chevron.' },
  ],
  'html-2': [
    { question: 'Quelle balise pour un paragraphe de texte ?', choix: ['<text>', '<para>', '<p>'], reponse: 2, explication: '<p> comme paragraphe.' },
    { question: 'Si tu vas à la ligne dans ton code HTML, que se passe-t-il dans la page ?', choix: ['Rien, le texte reste sur la même ligne', 'Le texte va aussi à la ligne', 'La page plante'], reponse: 0, explication: 'Le navigateur ignore les retours à la ligne du code : il faut un nouveau <p> (ou un <br>).' },
  ],
  'html-3': [
    { question: 'Quelle balise donne le sous-titre le plus important ?', choix: ['<h6>', '<h2>', '<sub>'], reponse: 1, explication: 'h1 est le titre principal, h2 le sous-titre le plus important… jusqu’à h6.' },
  ],
  'html-4': [
    { question: 'Comment s’appelle le fait de mettre une balise dans une autre ?', choix: ['Empiler', 'Imbriquer', 'Encadrer'], reponse: 1, explication: 'On imbrique : <p>Un mot <strong>important</strong></p>.' },
    { question: 'Lequel est bien écrit ?', choix: ['<p><strong>Oui</p></strong>', '<p><strong>Oui</strong></p>', '<strong><p>Oui</strong></p>'], reponse: 1, explication: 'La dernière balise ouverte est la première fermée.' },
  ],
  'html-5': [
    { question: 'Dans une liste à puces, quelle balise contient chaque élément ?', choix: ['<ul>', '<item>', '<li>'], reponse: 2, explication: '<ul> entoure la liste, <li> pour chaque élément.' },
  ],
  'html-6': [
    { question: 'Quel attribut donne l’adresse d’une image ?', choix: ['href', 'src', 'alt'], reponse: 1, explication: 'src = source. alt = la description.' },
    { question: 'À quoi sert l’attribut alt d’une image ?', choix: ['À la décrire pour ceux qui ne la voient pas', 'À changer sa taille', 'À la rendre cliquable'], reponse: 0, explication: 'alt est lu par les lecteurs d’écran, et affiché si l’image ne charge pas.' },
  ],
  'html-7': [
    { question: 'Quel attribut contient l’adresse d’un lien <a> ?', choix: ['src', 'link', 'href'], reponse: 2, explication: '<a href="https://…">texte</a>' },
    { question: 'Que fait target="_blank" sur un lien ?', choix: ['Il ouvre le lien dans un nouvel onglet', 'Il rend le lien invisible', 'Il désactive le lien'], reponse: 0, explication: 'Le lien s’ouvre dans un nouvel onglet.' },
  ],
  'html-8': [
    { question: 'Où met-on le titre principal du site, en général ?', choix: ['Dans <footer>', 'Dans <header>', 'Dans <main>'], reponse: 1, explication: '<header> = l’en-tête en haut, <main> = le contenu, <footer> = le pied de page.' },
  ],
  'css-1': [
    { question: 'Dans « body { background-color: navy; } », qu’est-ce que body ?', choix: ['La propriété', 'Le sélecteur', 'La valeur'], reponse: 1, explication: 'Le sélecteur dit à qui on applique le style.' },
    { question: 'Qu’est-ce qui termine chaque déclaration CSS ?', choix: ['Un point-virgule ;', 'Un point .', 'Une virgule ,'], reponse: 0, explication: 'propriété: valeur; avec le point-virgule à la fin.' },
  ],
  'css-2': [
    { question: 'Quelle propriété change la couleur du TEXTE ?', choix: ['background-color', 'font-color', 'color'], reponse: 2, explication: 'color pour le texte, background-color pour le fond.' },
    { question: 'Laquelle est une couleur valide en CSS ?', choix: ['#ff6b6b', '#zz9900', 'ff6b6b'], reponse: 0, explication: 'Un # suivi de 6 caractères entre 0-9 et a-f.' },
  ],
  'css-3': [
    { question: 'Avec 3rem, le texte est…', choix: ['3 fois plus grand que la taille normale', '3 pixels de haut', '3 % plus grand'], reponse: 0, explication: '1rem = la taille normale du texte.' },
  ],
  'css-4': [
    { question: 'Comment s’écrit le sélecteur de la classe « carte » ?', choix: ['#carte', '.carte', 'carte'], reponse: 1, explication: 'Un point pour une classe, un # pour un id.' },
    { question: 'padding, c’est l’espace…', choix: ['À l’intérieur, entre le bord et le contenu', 'À l’extérieur, autour de l’élément', 'Entre les lignes de texte'], reponse: 0, explication: 'padding = intérieur, margin = extérieur.' },
  ],
  'css-5': [
    { question: 'Que fait margin: 0 auto sur un élément qui a un max-width ?', choix: ['Il le centre horizontalement', 'Il le cache', 'Il le colle à gauche'], reponse: 0, explication: 'auto à gauche et à droite = marges égales = centré.' },
  ],
  'css-6': [
    { question: 'Que veut dire :hover dans « a:hover » ?', choix: ['Quand la souris est sur le lien', 'Quand on a déjà cliqué', 'Quand la page charge'], reponse: 0, explication: ':hover est une pseudo-classe : l’état « survolé ».' },
    { question: 'À quoi sert transition ?', choix: ['À animer en douceur un changement de style', 'À changer de page', 'À cacher un élément'], reponse: 0, explication: 'transition: all 0.3s; = le changement dure 0,3 seconde.' },
  ],
  'js-1': [
    { question: 'Où s’affiche un console.log("Salut") ?', choix: ['Dans la console', 'En gros au milieu de la page', 'Dans le titre de l’onglet'], reponse: 0, explication: 'La console sert au développeur, le visiteur ne la voit pas.' },
    { question: 'Comment appelle-t-on un texte entre guillemets en JS ?', choix: ['Un mot-clé', 'Une chaîne de caractères', 'Une balise'], reponse: 1, explication: '"Bonjour" est une chaîne de caractères.' },
  ],
  'js-2': [
    { question: 'Quel mot crée une variable ?', choix: ['var-create', 'let', 'new'], reponse: 1, explication: 'let score = 0; crée une variable score.' },
    { question: 'Que renvoie document.querySelector("h1") ?', choix: ['Le premier <h1> de la page', 'Tous les <h1>', 'Le texte « h1 »'], reponse: 0, explication: 'querySelector renvoie le PREMIER élément qui correspond.' },
  ],
  'js-3': [
    { question: 'Dans addEventListener("click", …), qu’est-ce que "click" ?', choix: ['Une variable', 'Un événement', 'Une balise'], reponse: 1, explication: 'C’est l’événement à écouter : le clic.' },
    { question: 'Le sélecteur de l’élément id="reponse" s’écrit…', choix: ['".reponse"', '"reponse"', '"#reponse"'], reponse: 2, explication: '# pour un id.' },
  ],
  'js-4': [
    { question: 'Que fait classList.toggle("sombre") ?', choix: ['Ajoute la classe si elle est absente, l’enlève sinon', 'Supprime l’élément', 'Ajoute la classe deux fois'], reponse: 0, explication: 'Comme un interrupteur.' },
  ],
  'js-5': [
    { question: 'Si compteur vaut 4, que vaut-il après compteur = compteur + 1 ?', choix: ['4', '5', '41'], reponse: 1, explication: 'On prend 4, on ajoute 1, on range 5 dans la variable.' },
    { question: 'Pourquoi créer « let compteur = 0 » EN DEHORS de la fonction du clic ?', choix: ['Sinon il repart de 0 à chaque clic', 'Parce que c’est plus joli', 'Ça ne change rien'], reponse: 0, explication: 'Une variable créée dans la fonction est recréée à chaque clic.' },
  ],
  'html-9': [
    { question: 'À quoi sert l’attribut for d’un <label> ?', choix: ['À relier l’étiquette à son champ (même valeur que l’id du champ)', 'À répéter le champ plusieurs fois', 'À envoyer le formulaire'], reponse: 0, explication: 'for="pseudo" relie le label au champ id="pseudo".' },
    { question: 'Quelle balise pour écrire un long message sur plusieurs lignes ?', choix: ['<input>', '<textarea>', '<message>'], reponse: 1, explication: '<input> = une ligne, <textarea> = plusieurs lignes.' },
  ],
  'html-10': [{ question: 'Quelle balise contient la légende d’une image dans une <figure> ?', choix: ['<caption>', '<figcaption>', '<legend>'], reponse: 1, explication: '<figure> entoure l’image et son <figcaption>.' }],
  'html-11': [
    { question: 'Combien de <h1> dans une page, en général ?', choix: ['Un seul', 'Un par paragraphe', 'Autant qu’on veut'], reponse: 0, explication: 'Le <h1> est le titre principal : il n’y en a qu’un.' },
    { question: 'Après un <h1>, peut-on mettre directement un <h3> ?', choix: ['Oui, aucun problème', 'Non, il faut d’abord un <h2>', 'Seulement en bas de page'], reponse: 1, explication: 'On ne saute pas de niveau : h1, puis h2, puis h3.' },
  ],
  'css-7': [{ question: 'Comment utilise-t-on la variable --principale ?', choix: ['color: --principale;', 'color: var(--principale);', 'color: $principale;'], reponse: 1, explication: 'On déclare avec --nom et on utilise avec var(--nom).' }],
  'css-8': [{ question: 'Que veut dire @media (max-width: 600px) ?', choix: ['Seulement si l’écran fait 600 px de large ou moins', 'Seulement si l’écran fait plus de 600 px', 'Toujours'], reponse: 0, explication: 'max-width = largeur maximum : les petits écrans.' }],
  'css-9': [{ question: 'Dans @keyframes, que décrivent from et to ?', choix: ['Le début et la fin de l’animation', 'La couleur et la taille', 'Le premier et le dernier élément'], reponse: 0, explication: 'from = état de départ, to = état d’arrivée.' }],
  'js-6': [{ question: 'Si reponse.hidden vaut true, que vaut !reponse.hidden ?', choix: ['true', 'false', 'hidden'], reponse: 1, explication: '! veut dire « le contraire ».' }],
  'js-7': [{ question: 'Si heure vaut 20, quel bloc s’exécute dans if (heure < 18) { A } else { B } ?', choix: ['A', 'B', 'Les deux'], reponse: 1, explication: '20 n’est pas plus petit que 18 : c’est le else qui s’exécute.' }],
  'js-8': [{ question: 'Combien de fois tourne for (let jeu of ["a", "b", "c"]) ?', choix: ['1 fois', '3 fois', 'À l’infini'], reponse: 1, explication: 'Une fois pour chaque élément du tableau.' }],
  'html-bonus-1': [{ question: 'Dans un tableau, que crée <tr> ?', choix: ['Une ligne', 'Une colonne', 'Une case'], reponse: 0, explication: 'tr = table row, une ligne.' }],
  'html-bonus-2': [{ question: 'Pour aller à l’élément id="contact", le lien est…', choix: ['href="contact"', 'href="#contact"', 'href=".contact"'], reponse: 1, explication: 'Un # suivi de l’id.' }],
  'css-bonus-1': [{ question: 'Sur quel élément met-on display: flex ?', choix: ['Sur le parent qui contient les éléments', 'Sur chaque élément à ranger', 'Sur le body uniquement'], reponse: 0, explication: 'Le parent devient un conteneur flex et range ses enfants.' }],
  'css-bonus-2': [{ question: 'Dans rgba(0, 0, 0, 0.4), que règle le 0.4 ?', choix: ['La transparence', 'La taille', 'Le flou'], reponse: 0, explication: 'Le dernier nombre est l’opacité, de 0 à 1.' }],
  'js-bonus-1': [{ question: 'Dans ["a", "b", "c"], quelle est la position de "a" ?', choix: ['1', '0', 'a'], reponse: 1, explication: 'Les positions commencent à 0.' }],
  'js-bonus-2': [{ question: 'Quelle propriété donne le texte écrit dans un <input> ?', choix: ['.textContent', '.value', '.text'], reponse: 1, explication: 'champ.value contient ce que le visiteur a tapé.' }],
};
