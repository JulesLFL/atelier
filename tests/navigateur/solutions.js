// Le site d'un élève « modèle », étape par étape : après chaque mission, le code doit
// réussir la mission. Et le code de l'étape d'avant ne doit PAS la réussir.
const IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='30'%3E%3Crect width='60' height='30' fill='teal'/%3E%3C/svg%3E";

const h = {
  titre: '<h1>Le repaire des gamers</h1>',
  intro: '<p>Ici, je partage mes jeux préférés.</p>',
  sections: '<h2>Mes jeux</h2>\n<p>Ceux que je préfère.</p>\n<h2>Mes astuces</h2>\n<p>Pour progresser.</p>',
  sectionsPunch: '<h2>Mes jeux</h2>\n<p>Ceux que je préfère, <strong>vraiment</strong>.</p>\n<h2>Mes astuces</h2>\n<p>Pour progresser.</p>',
  liste: '<ul>\n<li>Minecraft</li>\n<li>Zelda</li>\n<li>Celeste</li>\n</ul>',
  image: `<img src="${IMAGE}" alt="Un rectangle">`,
  lien: '<a href="https://fr.wikipedia.org/wiki/Jeu_vidéo">En savoir plus</a>',
};

const corps = (...parties) => parties.join('\n');
const html8 = (contenu, pied = '<p>Fait à L’Atelier</p>') => `<header>${h.titre}</header>\n<main>\n${contenu}\n</main>\n<footer>${pied}</footer>`;
const contenuBase = corps(h.intro, h.sectionsPunch, h.liste, h.image, h.lien);
const contenuCarte = corps(h.intro, '<section class="carte">', h.sectionsPunch, '</section>', h.liste, h.image, h.lien);

const css1 = 'body { background-color: #1e1b4b; }';
const css2 = `${css1}\nh1 { color: gold; }\np { color: white; }`;
const css3 = `body { background-color: #1e1b4b; font-family: Verdana, sans-serif; }\nh1 { color: gold; font-size: 3rem; }\np { color: white; }`;
const css4 = `${css3}\n.carte { background-color: #312e81; padding: 20px; border-radius: 16px; }`;
const css5 = `${css4}\nmain { max-width: 800px; margin: 0 auto; }`;
const css6 = `${css5}\n.carte { transition: transform 0.3s; }\n.carte:hover { transform: scale(1.05); }`;
const cssSombre = `${css6}\nbody.sombre { background-color: black; color: white; }`;

const js1 = 'console.log("Salut ! Mon JS marche");';
const js2 = `${js1}\nlet message = document.querySelector("footer p");\nmessage.textContent = "Écrit par mon JS";`;
const js3 = `${js2}\nlet bouton = document.querySelector("#clic");\nlet reponse = document.querySelector("#reponse");\nbouton.addEventListener("click", function () {\n  reponse.textContent = "Bien joué !";\n});`;
const js4 = `${js3}\nlet boutonTheme = document.querySelector("#theme");\nboutonTheme.addEventListener("click", function () {\n  document.body.classList.toggle("sombre");\n});`;
const js5 = `${js4}\nlet compteur = 0;\nlet affichage = document.querySelector("#nombre");\ndocument.querySelector("#like").addEventListener("click", function () {\n  compteur = compteur + 1;\n  affichage.textContent = compteur;\n});`;

const bouton = '<button id="clic">Clique-moi</button>\n<p id="reponse"></p>';
const boutonTheme = '<button id="theme">Ambiance</button>';
const like = '<button id="like">❤️</button>\n<p>Likes : <span id="nombre">0</span></p>';

export const ETAPES = [
  { mission: null, html: '<!-- Écris ton code ici 👇 -->', css: '', js: '' },
  { mission: 'html-1', html: h.titre },
  { mission: 'html-2', html: corps(h.titre, h.intro) },
  { mission: 'html-3', html: corps(h.titre, h.intro, h.sections) },
  { mission: 'html-4', html: corps(h.titre, h.intro, h.sectionsPunch) },
  { mission: 'html-5', html: corps(h.titre, h.intro, h.sectionsPunch, h.liste) },
  { mission: 'html-6', html: corps(h.titre, h.intro, h.sectionsPunch, h.liste, h.image) },
  { mission: 'html-7', html: corps(h.titre, contenuBase) },
  { mission: 'html-8', html: html8(contenuBase) },
  { mission: 'css-1', html: html8(contenuBase), css: css1 },
  { mission: 'css-2', html: html8(contenuBase), css: css2 },
  { mission: 'css-3', html: html8(contenuBase), css: css3 },
  { mission: 'css-4', html: html8(contenuCarte), css: css4 },
  { mission: 'css-5', html: html8(contenuCarte), css: css5 },
  { mission: 'css-6', html: html8(contenuCarte), css: css6 },
  { mission: 'js-1', html: html8(contenuCarte), css: css6, js: js1 },
  { mission: 'js-2', html: html8(contenuCarte), css: css6, js: js2 },
  { mission: 'js-3', html: html8(corps(contenuCarte, bouton)), css: css6, js: js3 },
  { mission: 'js-4', html: html8(corps(contenuCarte, bouton, boutonTheme)), css: cssSombre, js: js4 },
  { mission: 'js-5', html: html8(corps(contenuCarte, bouton, boutonTheme, like)), css: cssSombre, js: js5 },
].map((e, i, toutes) => {
  // Chaque étape hérite du CSS/JS de la précédente si elle ne les précise pas.
  const precedente = toutes.slice(0, i).reverse();
  return {
    ...e,
    css: e.css ?? precedente.find((p) => p.css !== undefined)?.css ?? '',
    js: e.js ?? precedente.find((p) => p.js !== undefined)?.js ?? '',
  };
});

// Erreurs classiques de débutant : elles ne doivent PAS valider la mission.
export const PIEGES = [
  { mission: 'html-1', html: '<h1></h1>', pourquoi: 'titre vide' },
  { mission: 'html-1', html: 'h1 Mon site', pourquoi: 'pas de balise' },
  { mission: 'html-5', html: '<ul><li>Un</li><li>Deux</li></ul>', pourquoi: 'seulement 2 éléments' },
  { mission: 'html-6', html: '<img src="" alt="x">', pourquoi: 'src vide' },
  { mission: 'html-7', html: '<a href="wikipedia">lien</a>', pourquoi: 'adresse sans http' },
  { mission: 'css-1', html: '<p>x</p>', css: 'body { background-color: nimportequoi; }', pourquoi: 'couleur invalide' },
  { mission: 'css-1', html: '<p>x</p>', css: 'body { background-color: red }}', pourquoi: 'accolade en trop… mais la couleur marche', attendu: true },
  { mission: 'js-3', html: '<button>Ok</button>', js: 'let b = document.querySelector("button");', pourquoi: 'pas d’écouteur de clic' },
  { mission: 'js-5', html: '<button>+</button><p id="n">0</p>', js: 'let c = 0; document.querySelector("button").addEventListener("click", function () { let c = 0; c = c + 1; document.querySelector("#n").textContent = c; });', pourquoi: 'variable recréée dans la fonction' },
];
