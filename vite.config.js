import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const racine = import.meta.dirname;

export default defineConfig({
  root: resolve(racine, 'client'),
  publicDir: resolve(racine, 'client/public'),
  build: {
    outDir: resolve(racine, 'dist'),
    emptyOutDir: true,
    target: 'es2020',
    chunkSizeWarningLimit: 900, // CodeMirror et ses langages pèsent ~650 Ko (≈ 220 Ko compressés)
    rollupOptions: {
      input: Object.fromEntries(
        ['index', 'atelier', 'connexion', 'mentor', 'vitrine', 'mentions-legales', 'confidentialite', 'conditions'].map((page) => [page, resolve(racine, `client/${page}.html`)]),
      ),
    },
  },
  resolve: { alias: { '@partage': resolve(racine, 'partage') } },
  server: { fs: { allow: [racine] } },
});
