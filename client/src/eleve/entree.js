import '../public/commun.js';
import { api } from '../commun/api.js';

const champ = document.getElementById('code');
const erreur = document.getElementById('erreur-entree');
const formulaire = document.getElementById('formulaire-entree');

const ERREURS = {
  code: 'Ce lien ne marche pas (ou plus). Tape ton code, ou demande un nouveau lien à ton mentor.',
  trop: 'Trop d’essais. Attends un quart d’heure avant de réessayer.',
};
const raison = new URLSearchParams(location.search).get('erreur');
if (ERREURS[raison]) erreur.textContent = ERREURS[raison];
history.replaceState(null, '', '/connexion');

// Mise en forme automatique : K7QF29XM → K7QF-29XM
champ.addEventListener('input', () => {
  const brut = champ.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  champ.value = brut.match(/.{1,4}/g)?.join('-') ?? '';
});

formulaire.addEventListener('submit', async (e) => {
  e.preventDefault();
  erreur.textContent = '';
  const bouton = formulaire.querySelector('button');
  bouton.disabled = true;
  try {
    await api('POST', '/api/entree', { code: champ.value });
    location.href = '/atelier';
  } catch (err) {
    erreur.textContent = err.message;
    bouton.disabled = false;
    champ.focus();
  }
});
champ.focus();
