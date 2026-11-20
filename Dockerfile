# ---------------------------------------------------------------
#  L'Atelier : image Docker (build multi-étapes, depuis le repo)
# ---------------------------------------------------------------

# Étape 1 : installation complète + construction de l'interface (Vite)
FROM node:22-alpine AS construction
WORKDIR /app
# Outils de compilation, au cas où better-sqlite3 n'a pas de binaire tout prêt pour le processeur du NAS
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm test && npm run build && npm prune --omit=dev

# Étape 2 : image finale, légère, sans les outils de développement
FROM node:22-alpine
ENV NODE_ENV=production \
    DATA_DIR=/data \
    PORT=3000
WORKDIR /app
COPY --from=construction /app/node_modules ./node_modules
COPY --from=construction /app/dist ./dist
COPY package.json ./
COPY serveur ./serveur
COPY partage ./partage
COPY contenu ./contenu
# Les fichiers peuvent arriver avec des droits restrictifs (clone fait par Portainer avec un
# umask 077 : « -rw------- root »). On les rend lisibles par tous, sans les rendre modifiables :
# l'utilisateur « node » peut lire l'application mais pas la changer.
RUN chmod -R a+rX /app && mkdir -p /data && chown node:node /data
# L'application ne tourne pas en root
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/sante').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "serveur/index.js"]
