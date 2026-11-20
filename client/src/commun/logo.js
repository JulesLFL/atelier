// Le logo de l'Atelier : trois « planches » de code empilées, aux couleurs des trois langages
// (orange HTML, bleu CSS, jaune JS), décalées comme des lignes indentées.
export const LOGO_SVG = `<svg class="logo-svg" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
  <rect x="5" y="8" width="22" height="6" rx="3" fill="#f97316"/>
  <rect x="12" y="17" width="23" height="6" rx="3" fill="#3b82f6"/>
  <rect x="5" y="26" width="15" height="6" rx="3" fill="#eab308"/>
</svg>`;

export function logo() {
  const span = document.createElement('span');
  span.className = 'logo';
  span.innerHTML = LOGO_SVG; // contenu fixe, défini ci-dessus (aucune donnée extérieure)
  return span;
}
