// Appels HTTP vers le serveur. L'en-tête X-Atelier sert de protection anti-CSRF.
export async function api(methode, url, corps) {
  const options = { method: methode, headers: { 'X-Atelier': '1' }, credentials: 'same-origin' };
  if (corps !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(corps);
  }
  let reponse;
  try {
    reponse = await fetch(url, options);
  } catch {
    throw Object.assign(new Error('Pas de connexion au serveur. Vérifie ta connexion internet.'), { statut: 0 });
  }
  let donnees = null;
  try {
    donnees = await reponse.json();
  } catch {
    /* réponse vide */
  }
  if (!reponse.ok) throw Object.assign(new Error(donnees?.erreur || `Erreur ${reponse.status}`), { statut: reponse.status });
  return donnees;
}
