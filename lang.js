/* Starlight language switch: Ukrainian (default) <-> German.
   Loaded with defer on the Albert Safin lessons and on the Safin hub. The German text of a page lives in
   i18n/de/<page>.js and is fetched only when the reader asks for German (or has chosen German before).
   German strings are matched to the page by the Ukrainian text of every block, so a block that was edited
   after the translation was made simply stays Ukrainian instead of showing a wrong sentence.
   The choice is remembered in localStorage under "sl-lang" ("de" / "uk"); ?lang=de or ?lang=uk sets it from a link. */
(function () {
  'use strict';
  if (window.SLANG && window.SLANG.__v) return;

  var d = document.documentElement;
  var cs = document.currentScript;
  var base = cs && cs.src ? cs.src.replace(/[^\/]*$/, '') : '';
  var KEY = 'sl-lang';
  var SEP = '␞';                       /* joins a text key and a tag signature when one text occurs with different markup */
  var CYR = /[А-яІіЇїЄєҐґЁё]/;

  var INLINE = { a: 1, abbr: 1, b: 1, bdi: 1, bdo: 1, cite: 1, code: 1, data: 1, dfn: 1, em: 1, i: 1, kbd: 1, mark: 1, q: 1, s: 1, samp: 1,
    small: 1, span: 1, strong: 1, sub: 1, sup: 1, time: 1, u: 1, 'var': 1, wbr: 1, br: 1, del: 1, ins: 1 };
  var RUNOK = { img: 1, svg: 1, canvas: 1 };
  var OKTREE = { svg: 1, canvas: 1, img: 1, script: 1, style: 1 };
  var SKIPT = { script: 1, style: 1, noscript: 1, template: 1, canvas: 1, svg: 1, head: 1, title: 1 };
  var SKIPCLS = ['audio-player', 'sl-nd-drawer', 'sl-nd-overlay', 'sl-nd-btn', 'sl-lang-btn', 'read-toggle'];
  var SKIPSEL = 'script,style,noscript,template,canvas,svg,head,title,.audio-player,.sl-nd-drawer,.sl-nd-overlay,.sl-nd-btn,.sl-lang-btn,.read-toggle';
  var ATTRS = ['data-label', 'aria-label', 'title', 'alt', 'placeholder'];
  var UI_DE = { 'Позначити прочитаним': 'Als gelesen markieren', '✓ Прочитано': '✓ Gelesen' };

  var has = Object.prototype.hasOwnProperty;
  function tg(n) { return n.tagName.toLowerCase(); }
  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
  function skipEl(n) {
    if (SKIPT[tg(n)]) return true;
    var c = n.classList;
    if (c) for (var i = 0; i < SKIPCLS.length; i++) if (c.contains(SKIPCLS[i])) return true;
    return false;
  }
  function allInline(n) {
    for (var c = n.firstElementChild; c; c = c.nextElementSibling) {
      var t = tg(c);
      if (OKTREE[t]) continue;
      if (!INLINE[t]) return false;
      if (!allInline(c)) return false;
    }
    return true;
  }
  function isLeaf(n) {
    var t = tg(n);
    if (INLINE[t] || SKIPT[t]) return false;
    return allInline(n) && CYR.test(n.textContent);
  }
  function runMember(c) {
    if (c.nodeType === 3) return true;
    var t = tg(c);
    if (RUNOK[t]) return true;
    return !!(INLINE[t] && allInline(c));
  }
  function sigOf(nodes) {
    var out = [];
    function rec(x) {
      if (x.nodeType !== 1) return;
      out.push(tg(x));
      for (var c = x.firstChild; c; c = c.nextSibling) rec(c);
    }
    for (var i = 0; i < nodes.length; i++) rec(nodes[i]);
    return out.join(',');
  }
  function kids(n) { return Array.prototype.slice.call(n.childNodes); }

  /* the same rules as the extractor that produced the German files: leaf blocks (block tags with inline-only
     content) plus runs of text/inline nodes that sit next to block children inside a container */
  function collect(root) {
    var units = [];
    (function walk(n) {
      if (skipEl(n)) return;
      if (isLeaf(n)) { units.push({ key: norm(n.textContent), sig: sigOf(kids(n)), target: n }); return; }
      var run = [];
      function flush() {
        if (run.length) {
          var t = '', core = [];
          for (var i = 0; i < run.length; i++) {
            t += run[i].textContent;
            if (!(run[i].nodeType === 3 && !/\S/.test(run[i].nodeValue))) core.push(run[i]);
          }
          if (CYR.test(t)) {
            var single = core.length === 1 && core[0].nodeType === 1 ? core[0] : null;
            units.push({ key: norm(t), sig: sigOf(single ? kids(single) : run), target: single, run: run.slice(), parent: n });
          }
          run.length = 0;
        }
      }
      for (var c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 8) continue;
        if (c.nodeType === 3 || runMember(c)) run.push(c);
        else if (c.nodeType === 1) { flush(); walk(c); }
      }
      flush();
    })(root);
    return units;
  }
  function lookup(map, key, sig) {
    var k = key + SEP + sig;
    if (has.call(map, k)) return map[k];
    return has.call(map, key) ? map[key] : undefined;
  }
  function wrap(run, parent) {
    var w = parent.ownerDocument.createElement('span');
    w.className = 'sl-run';
    parent.insertBefore(w, run[0]);
    for (var i = 0; i < run.length; i++) w.appendChild(run[i]);
    return w;
  }

  /* put the German blocks into root; returns what is needed to undo it */
  function applyTo(root, data) {
    var units = collect(root), hit = 0, miss = [], i;
    for (i = 0; i < units.length; i++) {
      var u = units[i], de = lookup(data.m, u.key, u.sig);
      if (de === undefined) { miss.push(u.key); continue; }
      if (!u.target) u.target = wrap(u.run, u.parent);
      u.orig = u.target.innerHTML;
      u.target.innerHTML = de;
      hit++;
    }
    var attrs = [], els = root.querySelectorAll('[' + ATTRS.join('],[') + ']');
    for (i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.closest && el.closest(SKIPSEL)) continue;
      for (var j = 0; j < ATTRS.length; j++) {
        var v = el.getAttribute(ATTRS[j]);
        if (v && CYR.test(v) && data.a && has.call(data.a, norm(v))) {
          attrs.push({ el: el, name: ATTRS[j], orig: v });
          el.setAttribute(ATTRS[j], data.a[norm(v)]);
        }
      }
    }
    return { units: units, attrs: attrs, hit: hit, miss: miss };
  }
  function undo(state) {
    for (var i = 0; i < state.units.length; i++) if (state.units[i].orig !== undefined) state.units[i].target.innerHTML = state.units[i].orig;
    for (var j = 0; j < state.attrs.length; j++) state.attrs[j].el.setAttribute(state.attrs[j].name, state.attrs[j].orig);
  }

  var SLANG = window.SLANG = {
    __v: 1, data: {}, _collect: collect, _apply: applyTo, _undo: undo,
    register: function (slug, data) { SLANG.data[slug] = data; }
  };

  /* ---------------------------------------------------------------- page behaviour */
  var slug = decodeURIComponent(location.pathname).split('/').pop().replace(/\.html?$/, '') || 'index';
  var origTitle = document.title, origLang = d.getAttribute('lang') || 'uk';
  var state = 'uk', applied = null, btn = null, busy = false, mo = null;

  function read() { try { var v = localStorage.getItem(KEY); return v === 'de' ? 'de' : 'uk'; } catch (e) { return 'uk'; } }
  function write(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  function loadData(cb) {
    if (SLANG.data[slug]) return cb(SLANG.data[slug]);
    var s = document.createElement('script');
    s.src = base + 'i18n/de/' + slug + '.js';
    s.onload = function () { cb(SLANG.data[slug] || null); };
    s.onerror = function () { cb(null); };
    document.head.appendChild(s);
  }

  /* the "mark as read" button is built by another script and rewrites its own text: keep it in the chosen language */
  function fixToggle() {
    var b = document.querySelector('.read-toggle');
    if (!b) return;
    var t = b.textContent, k;
    if (state === 'de') { if (has.call(UI_DE, t)) b.textContent = UI_DE[t]; }
    else for (k in UI_DE) if (has.call(UI_DE, k) && UI_DE[k] === t) { b.textContent = k; break; }
  }
  function watchToggle() {
    var b = document.querySelector('.read-toggle');
    if (!b || mo || !window.MutationObserver) return;
    mo = new MutationObserver(function () { if (busy) return; busy = true; fixToggle(); busy = false; });
    mo.observe(b, { childList: true, characterData: true, subtree: true });
  }

  function ui() {
    if (btn) {
      btn.textContent = state === 'de' ? 'UA' : 'DE';
      btn.setAttribute('aria-label', state === 'de' ? 'Читати українською' : 'Auf Deutsch lesen');
      btn.title = state === 'de' ? 'Українська' : 'Deutsch';
      btn.setAttribute('aria-pressed', state === 'de' ? 'true' : 'false');
    }
    d.setAttribute('data-sl-lang', state);
    busy = true; fixToggle(); busy = false;
  }

  function setLang(l) {
    if (l === 'de') {
      if (state === 'de') return;
      loadData(function (data) {
        if (!data) { try { console.warn('Starlight: no German version of ' + slug); } catch (e) {} return; }
        applied = applyTo(document.body, data);
        state = 'de';
        d.setAttribute('lang', 'de');
        if (data.t) document.title = data.t;
        write('de');
        watchToggle();
        ui();
      });
    } else {
      if (state === 'uk') { write('uk'); return; }
      if (applied) undo(applied);
      applied = null;
      state = 'uk';
      d.setAttribute('lang', origLang);
      document.title = origTitle;
      write('uk');
      ui();
    }
  }

  function addStyles() {
    var st = document.createElement('style');
    st.id = 'sl-lang-css';
    st.textContent =
      '.sl-nd-btn.sl-lang-btn{left:134px;font-size:14px;font-weight:600;letter-spacing:.04em}' +
      '@media(max-width:480px){.sl-nd-btn.sl-lang-btn{left:116px;font-size:13px}}' +
      '.sl-nd-drawer.open~.sl-lang-btn{opacity:0;pointer-events:none}' +
      /* German words are long: let them hyphenate and never push the page sideways */
      'html[lang="de"] .page{hyphens:auto;-webkit-hyphens:auto;overflow-wrap:break-word}' +
      'html[lang="de"] .page-title{font-size:clamp(33px,7.2vw,64px);overflow-wrap:anywhere;hyphens:auto;-webkit-hyphens:auto}' +
      /* the narration is Ukrainian */
      'html[lang="de"] .audio-player{display:none}';
    document.head.appendChild(st);
  }

  function init() {
    addStyles();
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sl-nd-btn sl-lang-btn';
    btn.addEventListener('click', function () { setLang(state === 'de' ? 'uk' : 'de'); });
    document.body.appendChild(btn);
    ui();
    var q = /[?&]lang=(de|uk|ua)\b/.exec(location.search);
    var want = q ? (q[1] === 'de' ? 'de' : 'uk') : read();
    if (q) write(want);
    if (want === 'de') setLang('de');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
