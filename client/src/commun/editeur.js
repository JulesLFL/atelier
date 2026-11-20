// Éditeur de code (CodeMirror 6) : un éditeur par langage, thème sombre maison.
import { EditorView, Decoration, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor, highlightSpecialChars, rectangularSelection, crosshairCursor } from '@codemirror/view';
import { EditorState, Compartment, Transaction, StateEffect, StateField } from '@codemirror/state';
import { setDiagnostics, lintGutter } from '@codemirror/lint';
import { defaultKeymap, history, historyKeymap, indentWithTab, undo, redo } from '@codemirror/commands';
import { HighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching, foldGutter, foldKeymap, indentUnit } from '@codemirror/language';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { tags as t } from '@lezer/highlight';

const couleurs = HighlightStyle.define([
  { tag: [t.tagName, t.angleBracket], color: '#fb923c' },
  { tag: t.attributeName, color: '#fcd34d' },
  { tag: [t.attributeValue, t.string, t.special(t.string)], color: '#86efac' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#8b93a7', fontStyle: 'italic' },
  { tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.moduleKeyword], color: '#c4b5fd' },
  { tag: [t.propertyName, t.definition(t.propertyName)], color: '#7dd3fc' },
  { tag: [t.className, t.labelName], color: '#fcd34d' },
  { tag: [t.number, t.bool, t.null, t.unit, t.color, t.atom], color: '#f9a8d4' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#67e8f9' },
  { tag: [t.variableName, t.definition(t.variableName)], color: '#e7eaf2' },
  { tag: [t.operator, t.punctuation, t.separator, t.bracket], color: '#cbd5e1' },
  { tag: t.invalid, color: '#fecaca', textDecoration: 'underline wavy #f87171' },
]);

const theme = EditorView.theme(
  {
    '&': { height: '100%', backgroundColor: 'var(--editeur-fond)', color: '#e7eaf2', fontSize: 'var(--taille-code, 16px)' },
    '.cm-scroller': { fontFamily: 'var(--police-code)', lineHeight: '1.6' },
    '.cm-content': { caretColor: '#fbbf24', padding: '12px 0' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#fbbf24', borderLeftWidth: '2px' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: '#5b3a1f !important' },
    '.cm-gutters': { backgroundColor: 'var(--editeur-fond)', color: '#6b7489', border: 'none', paddingLeft: '6px' },
    '.cm-activeLine': { backgroundColor: '#ffffff08' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: '#c4b5fd' },
    '.cm-matchingBracket': { backgroundColor: '#f9731640', outline: '1px solid #f97316' },
    '.cm-tooltip': { backgroundColor: '#1c2230', border: '1px solid #2e3648', borderRadius: '8px', overflow: 'hidden' },
    '.cm-tooltip-autocomplete > ul > li': { padding: '4px 10px !important' },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: '#f97316', color: '#1c1310' },
    '.cm-foldGutter span': { color: '#4b5366' },
    '.cm-panels': { backgroundColor: '#151a24', color: '#e7eaf2' },
    '.cm-searchMatch': { backgroundColor: '#fbbf2440' },
    '.cm-ligne-montree': { backgroundColor: '#fbbf2433', boxShadow: 'inset 4px 0 0 #fbbf24', animation: 'ligneMontree 1s ease-in-out 3' },
    '.cm-lintRange-error': { backgroundImage: 'none', textDecoration: 'underline wavy #f87171', textUnderlineOffset: '3px' },
    '.cm-lintRange-warning': { backgroundImage: 'none', textDecoration: 'underline wavy #fbbf24', textUnderlineOffset: '3px' },
    '.cm-tooltip-lint': { padding: '2px' },
    '.cm-diagnostic': { padding: '6px 10px', fontFamily: 'var(--police-ui)', fontSize: '14px', maxWidth: '360px' },
    '.cm-diagnostic-error': { borderLeft: '4px solid #f87171' },
    '.cm-diagnostic-warning': { borderLeft: '4px solid #fbbf24' },
    '.cm-gutter-lint': { width: '14px' },
  },
  { dark: true },
);

// Ligne « montrée » par le mentor : surlignée quelques secondes chez l'élève.
const montrer = StateEffect.define();
const champLigneMontree = StateField.define({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(montrer)) deco = e.value === null ? Decoration.none : Decoration.set([Decoration.line({ class: 'cm-ligne-montree' }).range(e.value)]);
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const LANGAGES = { html: () => html({ autoCloseTags: true }), css: () => css(), js: () => javascript() };

/**
 * @param {HTMLElement} parent
 * @param {'html'|'css'|'js'} langage
 * @param {{ doc?: string, lectureSeule?: boolean, surChangement?: (texte:string) => void }} options
 */
export function creerEditeur(parent, langage, { doc = '', lectureSeule = false, surChangement, surClicLigne } = {}) {
  const editable = new Compartment();
  const numeros = surClicLigne
    ? lineNumbers({
        domEventHandlers: {
          mousedown(view, ligne) {
            surClicLigne(view.state.doc.lineAt(ligne.from).number);
            return true;
          },
        },
      })
    : lineNumbers();
  const extensions = [
    numeros,
    champLigneMontree,
    lintGutter(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    indentUnit.of('  '),
    syntaxHighlighting(couleurs),
    bracketMatching(),
    closeBrackets(),
    autocompletion({ icons: false }),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap, indentWithTab]),
    LANGAGES[langage](),
    theme,
    EditorView.lineWrapping,
    editable.of([EditorView.editable.of(!lectureSeule), EditorState.readOnly.of(lectureSeule)]),
    EditorView.contentAttributes.of({ 'aria-label': `Code ${langage.toUpperCase()}`, spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off' }),
  ];
  if (surChangement) {
    extensions.push(EditorView.updateListener.of((u) => u.docChanged && surChangement(u.state.doc.toString(), u)));
  }
  const vue = new EditorView({ parent, state: EditorState.create({ doc, extensions, selection: { anchor: doc.length } }) });

  return {
    vue,
    langage,
    texte: () => vue.state.doc.toString(),
    /** Remplace tout le texte. Par défaut, l'élève peut revenir en arrière avec Ctrl+Z. */
    remplacer(texte, { historique = true } = {}) {
      if (texte === vue.state.doc.toString()) return;
      const selection = Math.min(vue.state.selection.main.head, texte.length);
      vue.dispatch({
        changes: { from: 0, to: vue.state.doc.length, insert: texte },
        selection: { anchor: selection },
        annotations: historique ? [] : [Transaction.addToHistory.of(false)],
      });
    },
    /** Insère un bout de code au curseur, sur une nouvelle ligne. */
    inserer(texte) {
      const { state } = vue;
      const pos = state.selection.main.head;
      const ligne = state.doc.lineAt(pos);
      const avant = ligne.text.trim() ? '\n' : '';
      const position = ligne.text.trim() ? ligne.to : pos;
      const insert = `${avant}${texte}\n`;
      vue.dispatch({ changes: { from: position, insert }, selection: { anchor: position + insert.length }, scrollIntoView: true });
      vue.focus();
    },
    /** Souligne des remarques : [{ de, a, gravite: 'erreur'|'conseil', message }] */
    remarques(liste) {
      const longueur = vue.state.doc.length;
      const diagnostics = liste
        .filter((r) => r.de < longueur)
        .map((r) => ({ from: r.de, to: Math.min(r.a, longueur), severity: r.gravite === 'erreur' ? 'error' : 'warning', message: r.message }));
      vue.dispatch(setDiagnostics(vue.state, diagnostics));
    },
    /** Surligne une ligne quelques secondes et la fait défiler à l'écran. */
    montrerLigne(numero, dureeMs = 6000) {
      const n = Math.min(Math.max(1, numero), vue.state.doc.lines);
      const ligne = vue.state.doc.line(n);
      vue.dispatch({ effects: [montrer.of(ligne.from), EditorView.scrollIntoView(ligne.from, { y: 'center' })] });
      clearTimeout(this._minuterieLigne);
      this._minuterieLigne = setTimeout(() => vue.dispatch({ effects: montrer.of(null) }), dureeMs);
    },
    annuler: () => undo(vue),
    retablir: () => redo(vue),
    focus: () => vue.focus(),
    mesurer: () => vue.requestMeasure(),
    detruire: () => vue.destroy(),
  };
}
