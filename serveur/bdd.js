// Base de données SQLite : schéma, migrations et toutes les requêtes.
// Données minimales : un pseudo et le travail de l'élève. Rien d'autre.
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MIGRATIONS = [
  // Version 1
  `
  CREATE TABLE eleves (
    id                INTEGER PRIMARY KEY,
    pseudo            TEXT NOT NULL UNIQUE,
    code_hash         TEXT NOT NULL UNIQUE,
    epoque_session    INTEGER NOT NULL DEFAULT 1,  -- incrémentée quand le code change : coupe les anciennes sessions
    mission_courante  TEXT,
    cree_le           INTEGER NOT NULL,
    derniere_activite INTEGER,
    temps_actif_s     INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE projets (
    eleve_id INTEGER PRIMARY KEY REFERENCES eleves(id) ON DELETE CASCADE,
    html     TEXT NOT NULL DEFAULT '',
    css      TEXT NOT NULL DEFAULT '',
    js       TEXT NOT NULL DEFAULT '',
    maj_le   INTEGER NOT NULL
  );
  CREATE TABLE progression (
    eleve_id           INTEGER NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
    mission_id         TEXT NOT NULL,
    reussie_le         INTEGER,
    indices_utilises   INTEGER NOT NULL DEFAULT 0,
    validee_par_mentor INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (eleve_id, mission_id)
  );
  CREATE TABLE deblocages (
    eleve_id INTEGER NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
    cible    TEXT NOT NULL,           -- 'module:css' ou 'mission:css-3'
    etat     TEXT NOT NULL CHECK (etat IN ('ouvert', 'ferme')),
    PRIMARY KEY (eleve_id, cible)
  );
  CREATE TABLE instantanes (
    eleve_id   INTEGER NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
    mission_id TEXT NOT NULL,
    html TEXT NOT NULL, css TEXT NOT NULL, js TEXT NOT NULL,
    cree_le    INTEGER NOT NULL,
    PRIMARY KEY (eleve_id, mission_id)
  );
  CREATE TABLE seances (
    id       INTEGER PRIMARY KEY,
    eleve_id INTEGER NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
    debut    INTEGER NOT NULL,
    fin      INTEGER NOT NULL,
    actif_s  INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX seances_eleve ON seances(eleve_id, fin);
  CREATE TABLE messages (
    id        INTEGER PRIMARY KEY,
    eleve_id  INTEGER NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
    type      TEXT NOT NULL CHECK (type IN ('message', 'indice')),
    texte     TEXT NOT NULL,
    envoye_le INTEGER NOT NULL,
    lu_le     INTEGER
  );
  CREATE INDEX messages_eleve ON messages(eleve_id, envoye_le);
  CREATE TABLE publications (
    eleve_id  INTEGER PRIMARY KEY REFERENCES eleves(id) ON DELETE CASCADE,
    html TEXT NOT NULL, css TEXT NOT NULL, js TEXT NOT NULL,
    onglets   TEXT NOT NULL,          -- modules inclus, ex. "html,css"
    publie_le INTEGER NOT NULL
  );
  `,
];

// Une pause de plus de 30 minutes démarre une nouvelle séance.
const ECART_NOUVELLE_SEANCE_MS = 30 * 60 * 1000;

const CODE_INITIAL = {
  html: '<!-- Écris ton code ici 👇 -->\n\n',
  css: '/* Ton CSS ici : il donne du style à ta page 🎨 */\n\n',
  js: '// Ton JavaScript ici : il rend ta page vivante ⚡\n\n',
};

// Alphabet sans caractères ambigus (pas de 0/O, 1/I/L).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function genererCodeAcces() {
  const octets = crypto.randomBytes(12);
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += ALPHABET[octets[i] % ALPHABET.length];
    if (i === 3 || i === 7) code += '-';
  }
  return code; // ex. K7QF-29XM-HD4P (≈ 59 bits d'aléa)
}

export function normaliserCode(code) {
  const brut = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (brut.length !== 12) return null;
  return `${brut.slice(0, 4)}-${brut.slice(4, 8)}-${brut.slice(8)}`;
}

export function ouvrirBdd({ dossier, secret, fichier = 'atelier.db' }) {
  let db;
  if (fichier === ':memory:') {
    db = new Database(':memory:');
  } else {
    mkdirSync(dossier, { recursive: true });
    db = new Database(path.join(dossier, fichier));
    db.pragma('journal_mode = WAL');
  }
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  const version = db.pragma('user_version', { simple: true });
  for (let v = version; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }

  // Le code d'accès n'est jamais stocké en clair : on garde une empreinte HMAC.
  const hacherCode = (code) => crypto.createHmac('sha256', secret).update(`code:${code}`).digest('hex');
  const maintenant = () => Date.now();

  const q = {
    creerEleve: db.prepare('INSERT INTO eleves (pseudo, code_hash, cree_le) VALUES (?, ?, ?)'),
    creerProjet: db.prepare('INSERT INTO projets (eleve_id, html, css, js, maj_le) VALUES (?, ?, ?, ?, ?)'),
    eleveParId: db.prepare('SELECT * FROM eleves WHERE id = ?'),
    eleveParPseudo: db.prepare('SELECT * FROM eleves WHERE pseudo = ?'),
    eleveParCode: db.prepare('SELECT * FROM eleves WHERE code_hash = ?'),
    listeEleves: db.prepare(`
      SELECT e.id, e.pseudo, e.cree_le, e.derniere_activite, e.temps_actif_s, e.mission_courante,
             (SELECT COUNT(*) FROM progression p WHERE p.eleve_id = e.id AND p.reussie_le IS NOT NULL) AS reussies,
             (SELECT publie_le FROM publications pu WHERE pu.eleve_id = e.id) AS publie_le
      FROM eleves e ORDER BY e.pseudo`),
    nouveauCode: db.prepare('UPDATE eleves SET code_hash = ?, epoque_session = epoque_session + 1 WHERE id = ?'),
    supprimerEleve: db.prepare('DELETE FROM eleves WHERE id = ?'),
    missionCourante: db.prepare('UPDATE eleves SET mission_courante = ? WHERE id = ?'),
    passage: db.prepare('UPDATE eleves SET derniere_activite = ? WHERE id = ?'),

    projet: db.prepare('SELECT html, css, js, maj_le FROM projets WHERE eleve_id = ?'),
    majProjet: db.prepare('UPDATE projets SET html = ?, css = ?, js = ?, maj_le = ? WHERE eleve_id = ?'),

    progression: db.prepare('SELECT mission_id, reussie_le, indices_utilises, validee_par_mentor FROM progression WHERE eleve_id = ?'),
    reussir: db.prepare(`
      INSERT INTO progression (eleve_id, mission_id, reussie_le, validee_par_mentor) VALUES (?, ?, ?, ?)
      ON CONFLICT (eleve_id, mission_id) DO UPDATE SET
        reussie_le = COALESCE(progression.reussie_le, excluded.reussie_le),
        validee_par_mentor = CASE WHEN progression.reussie_le IS NULL THEN excluded.validee_par_mentor ELSE progression.validee_par_mentor END`),
    annulerReussite: db.prepare('UPDATE progression SET reussie_le = NULL, validee_par_mentor = 0 WHERE eleve_id = ? AND mission_id = ?'),
    indice: db.prepare(`
      INSERT INTO progression (eleve_id, mission_id, indices_utilises) VALUES (?, ?, ?)
      ON CONFLICT (eleve_id, mission_id) DO UPDATE SET indices_utilises = MAX(progression.indices_utilises, excluded.indices_utilises)`),

    deblocages: db.prepare('SELECT cible, etat FROM deblocages WHERE eleve_id = ?'),
    definirDeblocage: db.prepare(`
      INSERT INTO deblocages (eleve_id, cible, etat) VALUES (?, ?, ?)
      ON CONFLICT (eleve_id, cible) DO UPDATE SET etat = excluded.etat`),
    retirerDeblocage: db.prepare('DELETE FROM deblocages WHERE eleve_id = ? AND cible = ?'),

    instantane: db.prepare('SELECT html, css, js, cree_le FROM instantanes WHERE eleve_id = ? AND mission_id = ?'),
    creerInstantane: db.prepare(`
      INSERT OR IGNORE INTO instantanes (eleve_id, mission_id, html, css, js, cree_le)
      SELECT eleve_id, ?, html, css, js, ? FROM projets WHERE eleve_id = ?`),

    derniereSeance: db.prepare('SELECT * FROM seances WHERE eleve_id = ? ORDER BY fin DESC LIMIT 1'),
    creerSeance: db.prepare('INSERT INTO seances (eleve_id, debut, fin, actif_s) VALUES (?, ?, ?, ?)'),
    prolongerSeance: db.prepare('UPDATE seances SET fin = ?, actif_s = actif_s + ? WHERE id = ?'),
    ajouterTemps: db.prepare('UPDATE eleves SET temps_actif_s = temps_actif_s + ?, derniere_activite = ? WHERE id = ?'),
    seances: db.prepare('SELECT debut, fin, actif_s FROM seances WHERE eleve_id = ? ORDER BY debut DESC LIMIT ?'),

    ajouterMessage: db.prepare('INSERT INTO messages (eleve_id, type, texte, envoye_le) VALUES (?, ?, ?, ?)'),
    messages: db.prepare('SELECT id, type, texte, envoye_le, lu_le FROM messages WHERE eleve_id = ? ORDER BY envoye_le DESC, id DESC LIMIT ?'),
    marquerLu: db.prepare('UPDATE messages SET lu_le = ? WHERE eleve_id = ? AND id = ? AND lu_le IS NULL'),

    publier: db.prepare(`
      INSERT INTO publications (eleve_id, html, css, js, onglets, publie_le)
      SELECT eleve_id, html, css, js, ?, ? FROM projets WHERE eleve_id = ?
      ON CONFLICT (eleve_id) DO UPDATE SET html = excluded.html, css = excluded.css, js = excluded.js,
        onglets = excluded.onglets, publie_le = excluded.publie_le`),
    depublier: db.prepare('DELETE FROM publications WHERE eleve_id = ?'),
    publication: db.prepare('SELECT html, css, js, onglets, publie_le FROM publications WHERE eleve_id = ?'),
  };

  return {
    db,
    fermer: () => db.close(),

    // --- Élèves -----------------------------------------------------------
    creerEleve(pseudo) {
      const code = genererCodeAcces();
      const t = maintenant();
      const id = db.transaction(() => {
        const { lastInsertRowid } = q.creerEleve.run(pseudo, hacherCode(code), t);
        q.creerProjet.run(lastInsertRowid, CODE_INITIAL.html, CODE_INITIAL.css, CODE_INITIAL.js, t);
        return Number(lastInsertRowid);
      })();
      return { eleve: q.eleveParId.get(id), code };
    },
    regenererCode(id) {
      const code = genererCodeAcces();
      const r = q.nouveauCode.run(hacherCode(code), id);
      return r.changes ? code : null;
    },
    eleveParId: (id) => q.eleveParId.get(id),
    eleveParPseudo: (pseudo) => q.eleveParPseudo.get(pseudo),
    eleveParCode(code) {
      const norme = normaliserCode(code);
      return norme ? q.eleveParCode.get(hacherCode(norme)) : undefined;
    },
    listeEleves: () => q.listeEleves.all(),
    supprimerEleve: (id) => q.supprimerEleve.run(id).changes > 0,
    definirMissionCourante: (id, missionId) => q.missionCourante.run(missionId, id),
    noterPassage: (id) => q.passage.run(maintenant(), id),

    // --- Projet (le site de l'élève) --------------------------------------
    projet: (id) => q.projet.get(id),
    majProjet(id, { html, css, js }) {
      return q.majProjet.run(html, css, js, maintenant(), id).changes > 0;
    },

    // --- Progression ------------------------------------------------------
    progression: (id) => q.progression.all(id),
    missionsReussies(id) {
      return new Set(q.progression.all(id).filter((p) => p.reussie_le).map((p) => p.mission_id));
    },
    reussirMission: (id, missionId, parMentor = false) => q.reussir.run(id, missionId, maintenant(), parMentor ? 1 : 0),
    annulerReussite: (id, missionId) => q.annulerReussite.run(id, missionId),
    noterIndice: (id, missionId, niveau) => q.indice.run(id, missionId, niveau),

    // --- Déblocages -------------------------------------------------------
    deblocages(id) {
      return Object.fromEntries(q.deblocages.all(id).map((d) => [d.cible, d.etat]));
    },
    definirDeblocage(id, cible, etat) {
      if (etat === null) q.retirerDeblocage.run(id, cible);
      else q.definirDeblocage.run(id, cible, etat);
    },

    // --- Instantanés (pour « Réinitialiser la mission ») -------------------
    prendreInstantane: (id, missionId) => q.creerInstantane.run(missionId, maintenant(), id),
    instantane: (id, missionId) => q.instantane.get(id, missionId),

    // --- Séances et temps passé -------------------------------------------
    noterActivite(id, secondesActives) {
      const t = maintenant();
      db.transaction(() => {
        const s = q.derniereSeance.get(id);
        if (s && t - s.fin < ECART_NOUVELLE_SEANCE_MS) q.prolongerSeance.run(t, secondesActives, s.id);
        else q.creerSeance.run(id, t, t, secondesActives);
        q.ajouterTemps.run(secondesActives, t, id);
      })();
    },
    seances: (id, limite = 20) => q.seances.all(id, limite),

    // --- Messages du mentor -----------------------------------------------
    ajouterMessage(id, type, texte) {
      const t = maintenant();
      const { lastInsertRowid } = q.ajouterMessage.run(id, type, texte, t);
      return { id: Number(lastInsertRowid), type, texte, envoye_le: t, lu_le: null };
    },
    messages: (id, limite = 50) => q.messages.all(id, limite),
    marquerLu: (id, messageId) => q.marquerLu.run(maintenant(), id, messageId).changes > 0,

    // --- Publication ------------------------------------------------------
    publier(id, onglets) {
      q.publier.run(onglets.join(','), maintenant(), id);
      return q.publication.get(id);
    },
    depublier: (id) => q.depublier.run(id).changes > 0,
    publication: (id) => q.publication.get(id),
  };
}
