// ============================================================================
//  LA SONDE
//  Ce script est injecté en tout premier dans la page de l'élève, à l'intérieur de
//  l'iframe sandbox. Il n'a AUCUN accès à l'application : il communique uniquement
//  par postMessage. Il sert à :
//    - remonter les console.log et les erreurs vers la mini-console ;
//    - remplacer alert() (bloqué dans la sandbox) par une petite bulle ;
//    - empêcher les liens de faire quitter l'aperçu ;
//    - protéger contre les boucles infinies ;
//    - (rôle « banc ») exécuter les vérifications des missions.
//  Il est lu tel quel (import ?raw) : pas d'import, pas de syntaxe exotique.
// ============================================================================
(function () {
  'use strict';
  var script = document.currentScript;
  var role = (script && script.getAttribute('data-role')) || 'apercu';
  var parentFenetre = window.parent;
  var nbMessages = 0;
  var MAX_MESSAGES = 300;
  var nbLogs = 0;
  var nbAlertes = 0;

  function envoyer(msg) {
    msg.atelier = true;
    msg.role = role;
    try {
      parentFenetre.postMessage(msg, '*');
    } catch (e) {
      /* rien */
    }
  }

  // --- Représentation lisible des valeurs pour la console ---------------------
  function decrire(valeur, profondeur) {
    profondeur = profondeur || 0;
    try {
      if (valeur === null) return 'null';
      if (valeur === undefined) return 'undefined';
      var type = typeof valeur;
      if (type === 'string') return profondeur ? JSON.stringify(valeur) : valeur;
      if (type === 'number' || type === 'boolean' || type === 'bigint') return String(valeur);
      if (type === 'function') return 'ƒ ' + (valeur.name || 'fonction') + '()';
      if (type === 'symbol') return valeur.toString();
      if (valeur instanceof Element) {
        var desc = '<' + valeur.tagName.toLowerCase();
        if (valeur.id) desc += ' id="' + valeur.id + '"';
        if (valeur.className && typeof valeur.className === 'string') desc += ' class="' + valeur.className + '"';
        return desc + '>';
      }
      if (valeur instanceof Error) return valeur.name + ': ' + valeur.message;
      if (profondeur > 2) return Array.isArray(valeur) ? '[…]' : '{…}';
      if (Array.isArray(valeur)) {
        return '[' + valeur.slice(0, 20).map(function (v) { return decrire(v, profondeur + 1); }).join(', ') + (valeur.length > 20 ? ', …' : '') + ']';
      }
      var cles = Object.keys(valeur).slice(0, 15);
      return '{ ' + cles.map(function (k) { return k + ': ' + decrire(valeur[k], profondeur + 1); }).join(', ') + (Object.keys(valeur).length > 15 ? ', …' : '') + ' }';
    } catch (e) {
      return String(valeur);
    }
  }

  function versConsole(niveau, args) {
    if (niveau === 'log' || niveau === 'info' || niveau === 'warn' || niveau === 'error') nbLogs++;
    if (role !== 'apercu') return;
    if (++nbMessages > MAX_MESSAGES) {
      if (nbMessages === MAX_MESSAGES + 1) envoyer({ type: 'console', niveau: 'warn', texte: '… trop de messages, la console s’arrête là.' });
      return;
    }
    var texte = Array.prototype.map.call(args, function (a) { return decrire(a, 0); }).join(' ');
    if (texte.length > 2000) texte = texte.slice(0, 2000) + '…';
    envoyer({ type: 'console', niveau: niveau, texte: texte });
  }

  ['log', 'info', 'warn', 'error', 'debug'].forEach(function (niveau) {
    var original = console[niveau];
    console[niveau] = function () {
      versConsole(niveau === 'debug' ? 'log' : niveau, arguments);
      try {
        original.apply(console, arguments);
      } catch (e) {
        /* rien */
      }
    };
  });

  // --- Erreurs ------------------------------------------------------------------
  window.addEventListener('error', function (e) {
    var cible = e.target;
    // Erreur de chargement d'une ressource (image introuvable…)
    if (cible && cible !== window && cible.tagName) {
      if (role === 'apercu' && cible.tagName === 'IMG') {
        envoyer({ type: 'ressource', balise: 'img', adresse: cible.getAttribute('src') || '' });
      }
      return;
    }
    if (role !== 'apercu') return;
    envoyer({ type: 'erreur', message: String(e.message || 'Erreur inconnue').replace(/^Uncaught\s+/, ''), ligne: e.lineno || null });
  }, true);

  window.addEventListener('unhandledrejection', function (e) {
    if (role !== 'apercu') return;
    var r = e.reason;
    envoyer({ type: 'erreur', message: r && r.message ? r.name + ': ' + r.message : String(r), ligne: null });
  });

  // --- Protection contre les boucles infinies -----------------------------------
  // Le JS de l'élève est instrumenté : chaque tour de boucle appelle __atelierGarde().
  var debutTache = 0;
  var tachePlanifiee = false;
  var boucleSignalee = false;
  window.__atelierGarde = function () {
    var t = performance.now();
    if (!tachePlanifiee) {
      tachePlanifiee = true;
      debutTache = t;
      setTimeout(function () { tachePlanifiee = false; }, 0);
    }
    if (t - debutTache > 1500) {
      if (!boucleSignalee && role === 'apercu') {
        boucleSignalee = true;
        envoyer({ type: 'erreur', message: 'ATELIER_BOUCLE_INFINIE', ligne: null });
      }
      return true;
    }
    return false;
  };

  // --- alert / confirm / prompt (bloqués par la sandbox) -------------------------
  var bulle = null;
  function afficherBulle(texte) {
    if (role !== 'apercu') return;
    if (!bulle) {
      var hote = document.createElement('atelier-bulle');
      var ombre = hote.attachShadow({ mode: 'closed' });
      ombre.innerHTML =
        '<style>:host{all:initial}div{position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:2147483647;' +
        'max-width:min(90vw,420px);background:#1c2230;color:#f2f4f8;border:1px solid #8b5cf6;border-radius:12px;' +
        'padding:12px 16px;font:15px/1.4 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.45);white-space:pre-wrap}' +
        'small{display:block;color:#a5abbd;font-size:12px;margin-bottom:4px}button{margin-top:10px;background:#8b5cf6;color:#fff;border:0;' +
        'border-radius:8px;padding:6px 14px;font:inherit;cursor:pointer}</style><div role="alertdialog"><small>alert()</small><span></span><br><button>OK</button></div>';
      ombre.querySelector('button').addEventListener('click', function () { hote.remove(); });
      bulle = { hote: hote, texte: ombre.querySelector('span') };
    }
    bulle.texte.textContent = texte;
    (document.body || document.documentElement).appendChild(bulle.hote);
  }

  window.alert = function (message) {
    nbAlertes++;
    var texte = message === undefined ? '' : decrire(message, 0);
    versConsole('info', ['💬 alert : ' + texte]);
    afficherBulle(texte);
  };
  window.confirm = function (message) {
    nbAlertes++;
    versConsole('warn', ['confirm() ne marche pas dans l’aperçu : on fait comme si tu avais cliqué sur OK. (' + decrire(message, 0) + ')']);
    return true;
  };
  window.prompt = function (message) {
    nbAlertes++;
    versConsole('warn', ['prompt() ne marche pas dans l’aperçu : il renvoie null. Utilise plutôt un <input> dans ta page !']);
    return null;
  };

  // --- Liens et formulaires : on reste dans l'aperçu -------------------------------
  document.addEventListener('click', function (e) {
    var lien = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!lien) return;
    var href = lien.getAttribute('href') || '';
    if (href.charAt(0) === '#') return; // ancre dans la page : ok
    e.preventDefault();
    if (role === 'apercu') envoyer({ type: 'lien', adresse: href });
  }, true);
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    if (role === 'apercu') versConsole('info', ['📨 Formulaire envoyé (dans l’aperçu, rien ne part vraiment).']);
  }, true);

  // --- Position de défilement (pour la garder quand l'aperçu se recharge) ----------
  if (role === 'apercu') {
    var minuterieScroll = null;
    window.addEventListener('scroll', function () {
      clearTimeout(minuterieScroll);
      minuterieScroll = setTimeout(function () { envoyer({ type: 'scroll', y: window.scrollY }); }, 100);
    }, { passive: true });
  }

  // --- Messages venant de l'application ---------------------------------------------
  window.addEventListener('message', function (e) {
    if (e.source !== parentFenetre || !e.data || e.data.atelier !== true) return;
    var d = e.data;
    if (d.type === 'scroll' && role === 'apercu') window.scrollTo(0, d.y || 0);
    if (d.type === 'verifier' && role === 'banc') {
      verifierTout(d.verifications || [], d.source || {}).then(function (resultats) {
        envoyer({ type: 'resultats', id: d.id, resultats: resultats });
      });
    }
  });

  // ⚠️ Pas de requestAnimationFrame ici : Chrome, Edge et Safari le mettent en pause dans les
  // iframes d'une autre origine qui sont hors de l'écran (le banc d'essai) ou pas encore touchées
  // (Safari iOS). Le signal « prêt » ne partirait jamais. Une minuterie marche partout.
  window.addEventListener('load', function () {
    setTimeout(function () { envoyer({ type: 'pret' }); }, 50);
  });

  // Dans le banc d'essai : pas d'animations, pour lire les styles finaux tout de suite.
  if (role === 'banc') {
    var calme = document.createElement('style');
    calme.id = 'atelier-banc';
    calme.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
    document.head.appendChild(calme);
  }

  // =================================================================================
  //  VÉRIFICATIONS DES MISSIONS (rôle « banc »)
  // =================================================================================
  function attendre(ms) {
    return new Promise(function (ok) { setTimeout(ok, ms); });
  }

  function tous(selecteur) {
    try {
      return Array.prototype.slice.call(document.querySelectorAll(selecteur));
    } catch (e) {
      return [];
    }
  }

  function texteVisible(doc) {
    if (!doc || !doc.body) return '';
    var copie = doc.body.cloneNode(true);
    Array.prototype.forEach.call(copie.querySelectorAll('script, style, template, atelier-bulle'), function (n) { n.remove(); });
    return (copie.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function outilsPour(source) {
    return {
      source: { html: source.html || '', css: source.css || '', js: source.js || '' },
      attendre: attendre,
      cliquer: function (el, fois) {
        fois = fois || 1;
        var i = 0;
        function suivant() {
          if (i++ >= fois) return Promise.resolve();
          if (el && el.click) el.click();
          return attendre(30).then(suivant);
        }
        return suivant();
      },
      texteVisible: texteVisible,
      pageSansJs: function () {
        return new DOMParser().parseFromString('<!DOCTYPE html><html><body>' + (source.html || '') + '</body></html>', 'text/html');
      },
      imageChargee: function (img) {
        if (img.complete) return Promise.resolve(img.naturalWidth > 0);
        return new Promise(function (ok) {
          var fini = function (v) { return function () { ok(v); }; };
          img.addEventListener('load', fini(true), { once: true });
          img.addEventListener('error', fini(false), { once: true });
          setTimeout(fini(img.naturalWidth > 0), 4000);
        });
      },
    };
  }

  function compilerTest(code) {
    try {
      return new Function('return (' + code + ')')();
    } catch (e) {
      // Forme « test(doc, outils) { … } » (méthode) : on l'emballe dans un objet.
      return new Function('return ({' + code + '}).test')();
    }
  }

  function listeProprietes(p) {
    return Array.isArray(p) ? p : [p];
  }

  // Les styles « sans le CSS de l'élève » : on désactive sa feuille de style le temps de les lire.
  function lireStyles(elements, proprietes) {
    return elements.map(function (el) {
      var s = getComputedStyle(el);
      return proprietes.map(function (p) { return s.getPropertyValue(p); });
    });
  }

  function verifierStyle(v, ctx) {
    var elements = tous(v.selecteur);
    if (!elements.length) return false;
    var props = listeProprietes(v.propriete);
    var avec = lireStyles(elements, props);
    if (v.pasDefaut) {
      var sans = ctx.stylesParDefaut(elements, props);
      return elements.some(function (_, i) {
        return props.some(function (_, j) { return avec[i][j] !== sans[i][j]; });
      });
    }
    return elements.some(function (_, i) {
      return avec[i].some(function (val) {
        if (v.egal !== undefined) return val === v.egal;
        if (v.contient !== undefined) return val.indexOf(v.contient) !== -1;
        return Boolean(val);
      });
    });
  }

  function reglesCss() {
    var balise = document.getElementById('atelier-css');
    var regles = [];
    function parcourir(liste) {
      Array.prototype.forEach.call(liste || [], function (r) {
        if (r.selectorText !== undefined) regles.push(r);
        if (r.cssRules) parcourir(r.cssRules);
      });
    }
    try {
      parcourir(balise && balise.sheet ? balise.sheet.cssRules : []);
    } catch (e) {
      /* rien */
    }
    return regles;
  }

  function verifierRegleCss(v) {
    return reglesCss().some(function (r) {
      if (v.contient && r.selectorText.indexOf(v.contient) === -1) return false;
      if (!v.proprietes) return true;
      var noms = Array.prototype.slice.call(r.style);
      return v.proprietes.some(function (p) {
        return noms.some(function (n) { return n === p || n.indexOf(p + '-') === 0; });
      });
    });
  }

  function instantaneDom() {
    return document.documentElement.outerHTML + '|' + nbAlertes;
  }

  function verifierUne(v, ctx) {
    try {
      switch (v.type) {
        case 'element': {
          var els = tous(v.selecteur).filter(function (el) {
            return !v.texteMin || (el.textContent || '').trim().length >= v.texteMin;
          });
          return Promise.resolve(els.length >= (v.min || 1) && (v.max === undefined || els.length <= v.max));
        }
        case 'attribut': {
          var motif = v.motif ? new RegExp(v.motif, 'i') : null;
          return Promise.resolve(tous(v.selecteur).some(function (el) {
            var val = (el.getAttribute(v.attribut) || '').trim();
            return v.nonVide === false ? el.hasAttribute(v.attribut) : val !== '' && (!motif || motif.test(val));
          }));
        }
        case 'style':
          return Promise.resolve(verifierStyle(v, ctx));
        case 'regleCss':
          return Promise.resolve(verifierRegleCss(v));
        case 'console':
          return Promise.resolve(nbLogs >= (v.min || 1));
        case 'clic': {
          var el = tous(v.selecteur)[0];
          if (!el) return Promise.resolve(false);
          var avant = instantaneDom();
          return ctx.outils.cliquer(el, v.fois || 1).then(function () {
            if (v.changement === 'dom' && instantaneDom() === avant) return false;
            if (!v.puis) return true;
            return verifierListe(v.puis, ctx).then(function (r) { return r.every(Boolean); });
          });
        }
        case 'script': {
          var fn = compilerTest(v.test);
          var resultat = Promise.resolve(fn(document, ctx.outils)).then(function (r) { return r === true; });
          var delai = attendre(4500).then(function () { return false; });
          return Promise.race([resultat, delai]);
        }
        default:
          return Promise.resolve(false);
      }
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  // Les vérifications passent une par une : un clic peut changer la page pour la suivante.
  function verifierListe(liste, ctx) {
    var resultats = [];
    var i = 0;
    function suivante() {
      if (i >= liste.length) return Promise.resolve(resultats);
      return verifierUne(liste[i++], ctx)
        .catch(function () { return false; })
        .then(function (r) {
          resultats.push(Boolean(r));
          return suivante();
        });
    }
    return suivante();
  }

  function verifierTout(liste, source) {
    var ctx = {
      outils: outilsPour(source),
      stylesParDefaut: function (elements, props) {
        var balise = document.getElementById('atelier-css');
        var feuille = balise && balise.sheet;
        if (feuille) feuille.disabled = true;
        try {
          return lireStyles(elements, props);
        } finally {
          if (feuille) feuille.disabled = false;
        }
      },
    };
    return verifierListe(liste, ctx);
  }
})();
