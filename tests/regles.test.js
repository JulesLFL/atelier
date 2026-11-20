import { describe, it, expect } from 'vitest';
import { calculerEtat, missionParDefaut, assemblerPage, titreDepuisHtml, ligneDebutJs, compterProgression } from '../partage/regles.js';
import { chargerCatalogue, controlerCatalogue } from '../serveur/catalogue.js';

const catalogue = await chargerCatalogue();
const statut = (etat, id) => etat.missions.find((m) => m.id === id).statut;

describe('Catalogue des missions', () => {
  it('contient 8 missions HTML, 6 CSS et 5 JS, plus 2 défis bonus par module', () => {
    const n = (mod, bonus = false) => catalogue.missions.filter((m) => m.module === mod && Boolean(m.bonus) === bonus).length;
    expect([n('html'), n('css'), n('js')]).toEqual([8, 6, 5]);
    expect([n('html', true), n('css', true), n('js', true)]).toEqual([2, 2, 2]);
  });

  it('ne livre jamais les réponses du quiz au navigateur', () => {
    expect(Object.keys(catalogue.quiz).length).toBeGreaterThan(20);
    expect(JSON.stringify(catalogue.public)).not.toMatch(/"reponse"/);
    expect(catalogue.public.quiz).toBeUndefined();
  });

  it('signale une question de quiz mal écrite', () => {
    const base = { modules: [{ id: 'html', titre: 'HTML' }], missions: [{ id: 'a', module: 'html', titre: 'T', objectif: 'O', explication: 'E', verifications: [{ type: 'console', label: 'l' }] }] };
    expect(() => controlerCatalogue({ ...base, quiz: { a: [{ question: 'Q', choix: ['x', 'y'], reponse: 2 }] } })).toThrow(/position d’un des choix/);
    expect(() => controlerCatalogue({ ...base, quiz: { zzz: [] } })).toThrow(/« zzz » n’existe pas/);
  });

  it('sérialise les fonctions de test pour le navigateur', () => {
    const v = catalogue.public.missions.find((m) => m.id === 'css-5').verifications[1];
    expect(typeof v.test).toBe('string');
    expect(() => new Function(`return (${v.test})`)()).not.toThrow();
  });

  it('signale clairement une mission mal écrite', () => {
    expect(() =>
      controlerCatalogue({
        modules: [{ id: 'html', titre: 'HTML' }],
        missions: [{ id: 'x', module: 'css', titre: 'T', objectif: 'O', explication: 'E', verifications: [{ type: 'truc' }] }],
      }),
    ).toThrow(/module « css » inconnu[\s\S]*type inconnu « truc »[\s\S]*label/);
  });
});

describe('Déblocages', () => {
  it('par défaut : HTML ouvert, première mission seule disponible', () => {
    const etat = calculerEtat(catalogue);
    expect(statut(etat, 'html-1')).toBe('disponible');
    expect(statut(etat, 'html-2')).toBe('verrouillee');
    expect(statut(etat, 'css-1')).toBe('verrouillee');
    expect(etat.onglets).toEqual(['html']);
    expect(missionParDefaut(etat)).toBe('html-1');
  });

  it('les missions se débloquent l’une après l’autre et restent accessibles', () => {
    const etat = calculerEtat(catalogue, {}, ['html-1', 'html-2']);
    expect(statut(etat, 'html-1')).toBe('reussie');
    expect(statut(etat, 'html-3')).toBe('disponible');
    expect(statut(etat, 'html-4')).toBe('verrouillee');
    expect(missionParDefaut(etat)).toBe('html-3');
  });

  it('le mentor peut forcer l’ouverture ou la fermeture', () => {
    const etat = calculerEtat(catalogue, { 'module:css': 'ouvert', 'mission:html-1': 'ferme', 'mission:js-2': 'ouvert' }, []);
    expect(statut(etat, 'html-1')).toBe('verrouillee');
    expect(statut(etat, 'css-1')).toBe('disponible');
    expect(statut(etat, 'js-2')).toBe('disponible');
    expect(statut(etat, 'js-1')).toBe('verrouillee');
    expect(etat.onglets).toEqual(['html', 'css', 'js']);
  });

  it('les défis bonus s’ouvrent quand le module est fini, sans bloquer la suite', () => {
    const html = catalogue.missions.filter((m) => m.module === 'html' && !m.bonus).map((m) => m.id);
    let etat = calculerEtat(catalogue, { 'module:css': 'ouvert' }, html.slice(0, 7));
    expect(statut(etat, 'html-bonus-1')).toBe('verrouillee');
    etat = calculerEtat(catalogue, { 'module:css': 'ouvert' }, html);
    expect(statut(etat, 'html-bonus-1')).toBe('disponible');
    expect(statut(etat, 'html-bonus-2')).toBe('disponible');
    expect(statut(etat, 'css-1')).toBe('disponible'); // le CSS n'attend pas les défis
    expect(missionParDefaut(etat)).toBe('css-1'); // les missions obligatoires passent avant
    expect(compterProgression(etat)).toEqual({ faites: 8, total: 19, bonusFaits: 0, bonusTotal: 6 });
  });

  it('fermer un module verrouille ses missions même réussies', () => {
    const etat = calculerEtat(catalogue, { 'module:html': 'ferme' }, ['html-1']);
    expect(statut(etat, 'html-1')).toBe('verrouillee');
    expect(missionParDefaut(etat)).toBe(null);
  });
});

describe('Assemblage de la page', () => {
  it('ajoute la structure autour du contenu de l’élève', () => {
    const page = assemblerPage({ html: '<h1>Salut</h1>', css: 'h1{}', js: 'let a = 1;' });
    expect(page).toMatch(/^<!DOCTYPE html>/);
    expect(page).toContain('<title>Salut</title>');
    expect(page).toContain('<style id="atelier-css">\nh1{}');
    expect(page.split('\n')[ligneDebutJs(page) - 1]).toBe('let a = 1;');
  });

  it('n’inclut pas les onglets non débloqués', () => {
    const page = assemblerPage({ html: '<p>x</p>', css: 'p{}', js: 'alert(1)' }, { onglets: ['html'] });
    expect(page).not.toContain('p{}');
    expect(page).not.toContain('alert');
  });

  it('empêche le JS de fermer sa balise script', () => {
    const page = assemblerPage({ html: '', css: '', js: 'let s = "</script><b>";' });
    expect(page).toContain('"<\\/script><b>"');
  });

  it('échappe le titre', () => {
    expect(titreDepuisHtml('<h1>Mon <i>site</i> &lt;3</h1>')).toBe('Mon site <3');
    expect(assemblerPage({ html: '<h1>"><script>x</script></h1>' })).toContain('<title>&quot;&gt;x</title>');
    expect(titreDepuisHtml('<p>rien</p>', 'Défaut')).toBe('Défaut');
  });
});
