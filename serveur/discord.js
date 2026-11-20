// Alertes Discord (optionnel) : DISCORD_WEBHOOK_URL.
// Sécurité :
//  - l'adresse est validée au démarrage (uniquement https://discord.com/api/webhooks/…) ;
//  - les redirections ne sont jamais suivies ;
//  - « allowed_mentions » vide : un message ne peut jamais faire de @everyone ni mentionner quelqu'un ;
//  - file d'attente limitée (pas de rafale), délai maximal de 8 s par envoi ;
//  - seul le pseudo de l'élève est envoyé (jamais son code ni ses messages).

const INTERVALLE_MS = 2000;
const FILE_MAX = 20;

export function creerDiscord(url, journal = console) {
  const file = [];
  let enCours = false;

  async function vider() {
    if (enCours) return;
    enCours = true;
    while (file.length) {
      const { texte, resoudre } = file.shift();
      let ok = false;
      try {
        let reponse = await poster(texte);
        if (reponse.status === 429) {
          const attente = Math.min(Number((await reponse.json().catch(() => ({}))).retry_after) || 2, 30);
          await new Promise((r) => setTimeout(r, attente * 1000));
          reponse = await poster(texte);
        }
        ok = reponse.ok;
        if (!ok) journal.warn?.(`Discord a répondu ${reponse.status}`);
      } catch (e) {
        journal.warn?.(`Discord injoignable : ${e.message}`);
      }
      resoudre(ok);
      await new Promise((r) => setTimeout(r, INTERVALLE_MS));
    }
    enCours = false;
  }

  function poster(texte) {
    return fetch(url, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'L’Atelier', content: texte, allowed_mentions: { parse: [] } }),
    });
  }

  return {
    actif: Boolean(url),
    /** Envoie un message (sans attendre). Renvoie une promesse : true si Discord l'a accepté. */
    envoyer(texte) {
      if (!url) return Promise.resolve(false);
      if (file.length >= FILE_MAX) return Promise.resolve(false);
      const propre = String(texte).replace(/@/g, '@​').slice(0, 1800);
      return new Promise((resoudre) => {
        file.push({ texte: propre, resoudre });
        vider();
      });
    },
  };
}
