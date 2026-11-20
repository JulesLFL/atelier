# 🛠️ L'Atelier

Un mini site pour apprendre le développement web **en construisant son propre site**.
L'élève écrit du HTML, puis du CSS, puis du JavaScript, et voit sa page se construire en direct.
Le mentor suit tout en temps réel, débloque les étapes et publie le site final.

- **Mode Missions** : 19 petites missions guidées (8 HTML, 6 CSS, 5 JS), avec checklist automatique, indices et célébration.
- **Mode Bac à sable** : l'élève construit ce qu'il veut, avec un mémo (lexique, balises, propriétés, bouts de JS) copiable en un clic.
- **Panneau mentor** (`/mentor`) : déblocages, vue en direct du code et de l'aperçu, messages et indices, progression, publication.
- **Sites publiés** : `/site/<pseudo>`, une copie figée que l'élève peut montrer à ses proches.

---

## Sommaire

1. [Lancer en local](#1-lancer-en-local)
2. [Déployer sur le NAS TrueNAS Scale](#2-déployer-sur-le-nas-truenas-scale)
3. [Cloudflare Tunnel (latelier.juleslfl.dev)](#3-cloudflare-tunnel-latelierjuleslfldev)
4. [Ajouter ou modifier une mission](#4-ajouter-ou-modifier-une-mission)
5. [Utilisation pendant une séance](#5-utilisation-pendant-une-séance)
6. [Sécurité et données](#6-sécurité-et-données)
7. [Organisation du code](#7-organisation-du-code)
8. [Publier le code sur GitHub](#8-publier-le-code-sur-github)

---

## 1. Lancer en local

Prérequis : **Node.js 22** ou plus. (Pour tester avec Docker en local : `docker network create web_tunnel` une seule fois.)

```bash
npm install
cp .env.example .env
```

Dans `.env`, remplis au minimum :

```ini
MENTOR_PASSWORD=un-mot-de-passe-solide
SESSION_SECRET=<résultat de : openssl rand -hex 32>
PUBLIC_URL=http://localhost:3000
PORT=3000
```

Puis :

```bash
npm run dev        # serveur + interface avec rechargement automatique (Vite)
# ou, comme en production :
npm run build && npm start
```

- Atelier de l'élève : <http://localhost:3000> (redirige vers `/entree` si pas connecté)
- Panneau mentor : <http://localhost:3000/mentor>

Dans le panneau mentor, clique sur **« + Nouveau »**, choisis un pseudo : tu obtiens le **lien personnel** de l'élève.

### Tests

```bash
npm test                                 # serveur, règles de déblocage, missions, erreurs en français (~3 s)
npm run build && npm run test:navigateur # tests dans un vrai navigateur (~1 min)
```

`test:navigateur` pilote **le Firefox déjà installé** sur ta machine, en mode invisible (rien n'est téléchargé). Il vérifie :

- pour chacune des 19 missions : la solution de référence la réussit, l'étape d'avant ne la réussit pas, et les erreurs classiques ne la valident pas ;
- le parcours de l'élève : ouverture du lien → première balise → mission réussie (en environ 4 secondes) ;
- l'isolation de l'aperçu : pas d'accès aux cookies, à l'application, à l'API ;
- les erreurs JS traduites en français, la protection contre les boucles infinies ;
- le panneau mentor : vue en direct, déblocage, publication.

Les captures d'écran sont enregistrées dans `tests/navigateur/captures/`.

---

## 2. Déployer sur le NAS TrueNAS Scale

L'image est construite **à partir du repo** (Dockerfile multi-étapes : installation, tests, build, puis image finale légère).
La base SQLite est dans un **volume persistant** (`atelier-donnees`) : elle survit aux mises à jour.

### Option A : Portainer (recommandé)

1. Portainer → **Stacks** → **Add stack** → **Repository**.
2. **Repository URL** : l'URL de ton repo GitHub (s'il est privé, ajoute un *Personal Access Token* GitHub en lecture seule dans « Authentication »).
3. **Compose path** : `docker-compose.yml`.
4. **Environment variables** (en bas), ajoute :

   | Variable | Valeur |
   |---|---|
   | `MENTOR_PASSWORD` | ton mot de passe mentor |
   | `SESSION_SECRET` | 64 caractères aléatoires (`openssl rand -hex 32`) |
   | `PUBLIC_URL` | `https://latelier.juleslfl.dev` |
   | `PORT` | `30085` (accès depuis la maison : `http://IP-DU-NAS:30085`) |

5. **Deploy the stack**. Le premier build prend 2 à 3 minutes.
6. Vérifie : `http://IP-DU-NAS:30085/mentor`.

**Mettre à jour** après un `git push` : stack → **Pull and redeploy** (coche « Re-pull image and redeploy »).

### Option B : en SSH sur le NAS

```bash
git clone https://github.com/<toi>/atelier.git
cd atelier
cp .env.example .env
nano .env                  # remplis MENTOR_PASSWORD, SESSION_SECRET, PUBLIC_URL, PORT
docker compose up -d       # construit l'image et lance le site
```

Mettre à jour : `git pull && docker compose up -d --build`.

### Où sont les données ?

Dans le volume Docker `atelier_atelier-donnees` (fichier `atelier.db`). Pour utiliser plutôt un **dataset** TrueNAS (pratique pour les snapshots), remplace dans `docker-compose.yml` :

```yaml
    volumes:
      - /mnt/tank/apps/atelier:/data
```

et donne le dossier à l'utilisateur du conteneur (UID 1000) : `chown -R 1000:1000 /mnt/tank/apps/atelier`.

**Sauvegarde** : le plus simple est un snapshot du dataset. Sinon :

```bash
docker compose stop atelier
docker run --rm -v atelier_atelier-donnees:/data -v "$PWD":/sauvegarde alpine cp /data/atelier.db /sauvegarde/atelier-$(date +%F).db
docker compose start atelier
```

### Durcissement du conteneur (déjà configuré)

L'application tourne avec un utilisateur non-root, sur un système de fichiers en lecture seule (sauf `/data`), avec `no-new-privileges` et un *healthcheck* sur `/api/sante`. Un `docker stop` enregistre le code en cours avant de quitter.

---

## 3. Cloudflare Tunnel (latelier.juleslfl.dev)

Le site passe par le **tunnel Cloudflare déjà en place sur le NAS** (conteneur `cloudflared`, tunnel « géré localement »). Aucun port n'est ouvert sur la box, et le temps réel (WebSocket) passe par le tunnel sans réglage particulier.

La stack rejoint le réseau Docker **`web_tunnel`** (déclaré `external` dans `docker-compose.yml`). Le tunnel joint donc l'Atelier à l'adresse **`http://atelier:3000`**, avec le nom du conteneur.

### a) Déclarer l'adresse dans le tunnel

TrueNAS › **System** › **Shell** :

```bash
sudo nano /mnt/NAS/cloudflared/config.yml
```

Ajoute la règle **avant** la dernière ligne (`- service: http_status:404`, qui doit toujours rester en dernier) :

```yaml
  - hostname: latelier.juleslfl.dev
    service: http://atelier:3000
```

Puis redémarre le conteneur `cloudflared` dans Portainer. Ses logs doivent afficher `Registered tunnel connection`.

### b) Créer l'entrée DNS

Cloudflare › `juleslfl.dev` › **DNS** › **Records** › **Add record** :

| Type | Nom | Cible | Proxy |
|---|---|---|---|
| `CNAME` | `latelier` | `<identifiant-du-tunnel>.cfargotunnel.com` (la même cible que les autres sous-domaines) | ✅ Proxied (nuage orange) |

> Le sous-domaine est libre tant qu'aucun enregistrement `latelier` n'existe déjà dans ta zone DNS. Si tu en choisis un autre, change aussi `PUBLIC_URL`.

### c) Réglages Cloudflare à vérifier

- **WebSockets** : `juleslfl.dev` › **Network** › *WebSockets* = **On** (valeur par défaut). Sans ça, le direct passe par le *polling* : ça marche, mais c'est moins réactif.
- **Rocket Loader** et **Email Address Obfuscation** : à **désactiver** pour `latelier.juleslfl.dev` (*Rules* › *Configuration Rules*). Ils modifient le HTML et le JavaScript des pages, y compris le site de l'élève.
- **Cache** : les fichiers de `/assets/` ont un nom qui change à chaque build, donc pas besoin de numéro de version. Les pages, l'API et `/site/*` sont envoyées avec `no-cache` ou `no-store`.
- *(Optionnel)* une **règle de pare-feu** (comme pour `admin.juleslfl.dev`) sur le chemin `/mentor` et `/api/mentor`, par exemple « bloquer hors de France ». Ne bloque **pas** `/`, `/e/*`, `/entree`, `/site/*` ni `/socket.io/*`, sinon l'élève et ses proches seraient bloqués.

L'application lit la vraie IP du visiteur dans l'en-tête `CF-Connecting-IP`, uniquement pour limiter les essais de mot de passe et de code. Cette IP n'est **jamais enregistrée**.

### Si tu n'as pas (encore) de tunnel

Crée un réseau `docker network create web_tunnel`, puis un conteneur `cloudflared` sur ce réseau. Il suffit ensuite de pointer un nom public vers `http://atelier:3000`. La documentation de Cloudflare explique les deux modes (tableau de bord ou fichier `config.yml`).

---

## 4. Ajouter ou modifier une mission

Tout est dans **un seul fichier** : [`contenu/missions.js`](contenu/missions.js). Son en-tête documente tous les champs.

```js
{
  id: 'css-7',                      // unique, ne plus le changer une fois utilisé
  module: 'css',                    // 'html', 'css' ou 'js'
  titre: 'Une ombre stylée',
  objectif: 'Ajoute une ombre à tes cartes.',
  explication: `La propriété \`box-shadow\` ajoute une **ombre**…`,
  exemple: '.carte {\n  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);\n}',
  indices: ['Indice 1…', 'Indice 2, plus précis…'],
  memo: [{ terme: 'box-shadow', categorie: 'propriete', definition: 'Une ombre.', exemple: '…' }],
  verifications: [
    { type: 'style', selecteur: '.carte', propriete: 'box-shadow', pasDefaut: true, label: 'Une ombre sur tes cartes' },
  ],
},
```

- **L'ordre dans le fichier = l'ordre des missions** dans chaque module.
- **Mise en forme** des textes : `**gras**`, `*italique*`, `` `code` ``, ligne vide = paragraphe, `- ` = liste.
- **Vérifications disponibles** : `element`, `attribut`, `style`, `regleCss`, `console`, `clic`, `script` (ta propre fonction). Elles sont exécutées sur la vraie page de l'élève, dans un aperçu invisible.
- Elles doivent vérifier la **structure**, jamais un texte précis : chaque élève a son propre thème.

Ensuite :

```bash
npm test          # vérifie que le fichier est valide (le serveur refuse aussi de démarrer s'il y a une erreur, avec un message clair)
```

Puis redémarre le serveur, ou fais `git push` puis *Pull and redeploy* sur le NAS.

💡 Pour tester une nouvelle mission en conditions réelles, ajoute une étape dans `tests/navigateur/solutions.js` (le code attendu après la mission) et lance `npm run test:navigateur`.

---

## 5. Utilisation pendant une séance

1. **Avant la première séance** : `/mentor` → **+ Nouveau** → pseudo (pas de nom de famille). Copie le **lien personnel** et envoie-le à l'élève. Il n'est affiché qu'une fois, car il est stocké chiffré. Si l'élève le perd : onglet **Accès** → *Générer un nouveau lien*.
2. **Pendant la séance** : onglet **🔴 Direct**. Tu y vois le code, l'aperçu, la console (avec ses erreurs), la mission en cours, sa checklist et les indices utilisés. La barre du bas envoie un message ou un indice, qui s'affiche chez l'élève en notification discrète.
3. **Débloquer la suite** : onglet **🗺️ Parcours**. L'interrupteur d'un module ouvre ses missions, qui se débloquent ensuite une par une. Le menu *Accès* d'une mission force son ouverture ou sa fermeture. Le bouton *Valider* sert si une vérification automatique bloque injustement.
4. **Publier** : onglet **🌍 Publication** → *Publier le site*. C'est une **copie figée** : refais *Mettre à jour* pour publier les nouveautés.

Côté élève : **A− / A+** règle la taille du code (pratique en partage d'écran Meet), **🔔** affiche les messages du mentor, et **⟲ Réinitialiser** remet le code tel qu'il était au début de la mission (Ctrl+Z annule).

---

## 6. Sécurité et données

**Données stockées** : un pseudo, le code de l'élève, sa progression, les messages du mentor et les horaires de séance. **Pas** d'e-mail, pas de nom, pas d'IP, aucun traceur ni service tiers. Les polices sont hébergées par le site lui-même.

| Risque | Protection |
|---|---|
| Le JS de l'élève attaque l'application | Aperçu dans une `iframe srcdoc sandbox="allow-scripts"` **sans** `allow-same-origin`. Origine opaque : pas d'accès aux cookies, au DOM de l'app, ni à l'API (testé). Les messages de l'iframe sont filtrés par `event.source`. |
| Site publié servi sur le même domaine | En-tête `Content-Security-Policy: sandbox …` : la page publiée a aussi une origine opaque (testé avec un mentor connecté). |
| Boucle infinie qui gèle l'onglet | Le JS de l'élève est analysé avec le parseur de CodeMirror. Chaque boucle reçoit une garde qui l’arrête si elle tourne plus de 1,5 s (2 s sur le site publié). |
| Vol de session / CSRF | Cookies signés HMAC, `HttpOnly`, `SameSite=Strict`, `Secure` en HTTPS. En-tête `X-Atelier` obligatoire sur toute modification. WebSocket refusé s'il vient d'un autre site. |
| Deviner un code d'accès | Codes aléatoires d'environ 59 bits, stockés hachés (HMAC). 10 essais par quart d'heure et par IP. Régénérer un code coupe immédiatement l'ancienne session. |
| Données invalides ou énormes | Tout est revérifié côté serveur : tailles (200 Ko par onglet), formats, pseudo, identifiants de mission. |
| Injection dans l'interface | Le texte de l'élève n'est jamais inséré en HTML (uniquement `textContent`, CodeMirror ou iframe sandbox). |

---

## 7. Organisation du code

```
contenu/missions.js        ← LES MISSIONS (le seul fichier à modifier pour le contenu)
partage/
  regles.js                déblocages, assemblage de la page (utilisé par le serveur ET le navigateur)
  garde-boucles.js         protection contre les boucles infinies
serveur/
  index.js · app.js        démarrage, Express, en-têtes de sécurité
  config.js                lecture du .env
  bdd.js                   SQLite : schéma, migrations, requêtes
  auth.js                  cookies signés, limiteur d'essais
  catalogue.js             chargement et contrôle de contenu/missions.js
  service.js               logique métier (état de l'élève, sauvegarde…)
  temps-reel.js            Socket.IO : élève ⇄ serveur ⇄ mentor
  routes/                  eleve.js · mentor.js · site.js
client/
  index.html · entree.html · mentor.html
  src/commun/              editeur (CodeMirror 6), apercu (iframes), sonde (script injecté
                           dans l'aperçu), console, erreurs en français, notifications
  src/eleve/               atelier de l'élève (missions, parcours, mémo, célébration)
  src/mentor/              panneau mentor
  src/styles/              thème sombre
tests/                     vitest (serveur, règles, outils) + navigateur/ (Firefox via WebDriver BiDi)
```

**Stack** : Node.js 22, Express 5, Socket.IO 4, better-sqlite3, Vite 7, CodeMirror 6. Front en JavaScript « vanilla » (sans framework) : il y a trois écrans, un framework n'apporterait que du poids.

---

## 8. Publier le code sur GitHub

Le dossier `atelier/` est un dépôt Git autonome. `.gitignore` exclut déjà `.env`, `node_modules/`, `dist/`, la base de données et les captures de test.

1. **Masquer son e-mail** (à faire une seule fois) : GitHub → *Settings* → *Emails* → coche *Keep my email addresses private* et *Block command line pushes that expose my email*. Copie l'adresse `…@users.noreply.github.com` affichée, puis dans `atelier/` :

   ```bash
   git config user.email "<adresse>@users.noreply.github.com"
   ```

2. **Premier envoi** :

   ```bash
   git add .
   git status                # .env ne doit PAS apparaître
   git commit -m "L'Atelier : première version"
   git branch -M main
   gh repo create atelier --public --source=. --remote=origin --push
   ```

3. **Ensuite** : `git add . && git commit -m "…" && git push`, puis *Pull and redeploy* dans Portainer.

---

## Licence

**Tous droits réservés.** Ce code est public pour être consulté, mais aucune licence n'est accordée : voir [LICENSE](LICENSE).
