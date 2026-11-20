// Point d'entrée : node serveur/index.js
import { chargerConfig } from './config.js';
import { creerApplication } from './app.js';

let config;
try {
  config = chargerConfig();
} catch (e) {
  console.error(`\n❌ ${e.message}\n\nCopie .env.example en .env et remplis-le.\n`);
  process.exit(1);
}

let appli;
try {
  appli = await creerApplication(config);
} catch (e) {
  console.error(`\n❌ Démarrage impossible :\n${e.message}\n`);
  process.exit(1);
}

appli.serveur.listen(config.port, () => {
  console.log(`🛠️  L'Atelier tourne sur http://localhost:${config.port}`);
  console.log(`   Panneau mentor : http://localhost:${config.port}/mentor`);
  console.log(`   URL publique   : ${config.urlPublique}`);
});

// Arrêt propre (docker stop) : on écrit le code en attente avant de quitter.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`\n${signal} reçu, sauvegarde et arrêt…`);
    appli.service.toutEcrire();
    // io.close() ferme aussi le serveur HTTP.
    appli.temps.io.close(() => {
      appli.bdd.fermer();
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
