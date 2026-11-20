import { describe, it, expect } from 'vitest';
import { calculerEtat, missionParDefaut, assemblerPage, titreDepuisHtml, ligneDebutJs } from '../partage/regles.js';
import { chargerCatalogue, controlerCatalogue } from '../serveur/catalogue.js';

const catalogue = await chargerCatalogue();
const statut = (etat, id) => etat.missions.find((m) => m.id === id).statut;

describe('Catalogue des missions', () => {
  it('contient 8 missions HTML, 6 CSS et 5 JS', () => {
    const n = (mod) => catalogue.missions.filter((m) => m.module === mod).length;
    expect([n('html'), n('css'), n('js')]).toEqual([8, 6, 5]);
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
