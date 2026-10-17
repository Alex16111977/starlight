/* Starlight light/dark switch. Loaded in <head> of every page (blocking, so there is no flash).
   Each page is natively light (#edecf3) or natively dark (#080b1a) - see data-native on this script tag.
   The opposite theme is the same page through an invert + hue-rotate filter: lightness flips, hues stay.
   Preference is stored in localStorage under "sl-theme"; without it a page keeps its native look. */
(function () {
  var d = document.documentElement;
  var cs = document.currentScript;
  var nat = cs && cs.getAttribute('data-native') === 'dark' ? 'dark' : 'light';
  var KEY = 'sl-theme';
  var F = 'invert(1) hue-rotate(180deg)';
  var ICONS = ['.card-icon', '.phrase-icon', '.nav-card-emoji', '.group-emoji', '.remedy-icon', '.food-icon', '.method-icon', '.link-card-icon',
    '.mood-icon', '.mood-btn', '.pyr-icon', '.pyramid-icon', '.profile-icon', '.layer-icon', '.tri-role-icon', '.reading-ico', '.warn-title-icon',
    '.search-icon', '.empty-icon', '.sl-emo'];

  var css =
    'html[data-invert]{filter:' + F + '}' +
    /* page background before the filter, chosen so that it lands on a soft violet-black / on the site light #edecf3 */
    'html[data-invert][data-native=light]{background-color:#e3e2ea}' +
    'html[data-invert][data-native=dark]{background-color:#131219}' +
    /* keep the stars pale on the dark version of a light page */
    'html[data-invert][data-native=light] canvas#stars{filter:' + F + '}' +
    /* the menu UI (nav-drawer.js) is built light: it follows the page, never the filter alone */
    'html[data-native=dark] .sl-nd-btn,html[data-native=dark] .sl-nd-drawer{filter:' + F + '}' +
    /* the scrim has a backdrop blur, so it cannot take a counter-filter: pre-invert its colour instead */
    'html[data-invert] .sl-nd-overlay{background:rgba(235,237,227,.4)}' +
    /* black drop shadows would turn into white halos */
    'html[data-invert] *{box-shadow:none!important}' +
    /* emoji icon boxes keep their real colours (filtered twice = unfiltered) */
    'html[data-invert] ' + ICONS.join(',html[data-invert] ') + '{filter:' + F + '}' +
    'html[data-theme=dark] .sl-nd-item-emoji,html[data-theme=dark] .sl-nd-search-icon{filter:' + F + '}' +
    'html[data-theme=dark]{scrollbar-color:#46445a #17161d}' +
    '@media print{html[data-invert]{filter:none;background:none}}';
  var st = document.createElement('style');
  st.id = 'sl-theme-css';
  st.textContent = css;
  (document.head || d).appendChild(st);

  function stored() {
    try {
      var v = localStorage.getItem(KEY);
      return v === 'dark' || v === 'light' ? v : null;
    } catch (e) { return null; }
  }

  function apply(theme) {
    d.setAttribute('data-theme', theme);
    if (theme !== nat) d.setAttribute('data-invert', '');
    else d.removeAttribute('data-invert');
    try { window.dispatchEvent(new CustomEvent('sl-theme', { detail: theme })); } catch (e) {}
  }

  d.setAttribute('data-native', nat);
  apply(stored() || nat);

  window.slTheme = {
    native: nat,
    get: function () { return d.getAttribute('data-theme'); },
    set: function (t) {
      if (t !== 'dark' && t !== 'light') return;
      try { localStorage.setItem(KEY, t); } catch (e) {}
      apply(t);
    },
    toggle: function () { this.set(this.get() === 'dark' ? 'light' : 'dark'); }
  };

  window.addEventListener('storage', function (e) {
    if (e.key === KEY && (e.newValue === 'dark' || e.newValue === 'light')) apply(e.newValue);
  });
})();
