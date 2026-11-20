import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const racine = import.meta.dirname;

// Morceaux communs des pages publiques (en-tête, pied de page…) : <!-- @entete --> dans le HTML
// est remplacé par client/morceaux/entete.html au moment du build (et en développement).
const morceaux = {
  name: 'morceaux-communs',
  transformIndexHtml: {
    order: 'pre',
    handler: (html) => html.replace(/<!-- @(\w+) -->/g, (_, nom) => readFileSync(resolve(racine, `client/morceaux/${nom}.html`), 'utf8')),
  },
};

export default defineConfig({
  plugins: [morceaux],
  root: resolve(racine, 'client'),
  publicDir: resolve(racine, 'client/public'),
  build: {
    outDir: resolve(racine, 'dist'),
    emptyOutDir: true,
    target: 'es2020',
    chunkSizeWarningLimit: 900, // CodeMirror et ses langages pèsent ~650 Ko (≈ 220 Ko compressés)
    rollupOptions: {
      input: Object.fromEntries(
        ['index', 'atelier', 'connexion', 'mentor', 'vitrine', 'mentions-legales', 'confidentialite', 'conditions', 'programme', 'journal', 'a-propos', 'parents', 'diplome'].map((page) => [page, resolve(racine, `client/${page}.html`)]),
      ),
    },
  },
  resolve: { alias: { '@partage': resolve(racine, 'partage') } },
  server: { fs: { allow: [racine] } },
});
