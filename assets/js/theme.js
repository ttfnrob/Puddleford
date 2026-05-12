/* Puddleford colour theme switcher
   6 themes derived from the podcast artwork.
   Random theme on new visit; cycles on click. */

var THEMES = [
  {
    name: 'Amber',
    accent:       '#d4982a',
    accentLight:  '#f0b840',
    accentBorder: '#6a4a1a',
    bg:           '#1a120a',  // warm dark brown
    bgCard:       '#241810',
    bgSecondary:  '#180e06'
  },
  {
    name: 'Terracotta',
    accent:       '#c4572a',
    accentLight:  '#e06030',
    accentBorder: '#7a3018',
    bg:           '#1a0f09',  // very slightly more red
    bgCard:       '#241410',
    bgSecondary:  '#180c06'
  },
  {
    name: 'Sage',
    accent:       '#7a9e6a',
    accentLight:  '#96be82',
    accentBorder: '#3a5e2a',
    bg:           '#10140e',  // very slightly more green
    bgCard:       '#181e14',
    bgSecondary:  '#0c120a'
  },
  {
    name: 'Dusk',
    accent:       '#b06090',
    accentLight:  '#cc80aa',
    accentBorder: '#6a3058',
    bg:           '#180f14',  // very slightly more violet
    bgCard:       '#221418',
    bgSecondary:  '#160c12'
  },
  {
    name: 'Copper',
    accent:       '#b87840',
    accentLight:  '#d89858',
    accentBorder: '#704820',
    bg:           '#1a1108',  // slightly warmer/more orange
    bgCard:       '#24160c',
    bgSecondary:  '#180e06'
  }
];

var SESSION_KEY = 'puddleford_theme';

function applyTheme(index) {
  var t = THEMES[index % THEMES.length];
  var r = document.documentElement;
  r.style.setProperty('--gold',         t.accent);
  r.style.setProperty('--gold-light',   t.accentLight);
  r.style.setProperty('--border-gold',  t.accentBorder);
  if (t.bg)          r.style.setProperty('--bg',           t.bg);
  if (t.bgCard)      r.style.setProperty('--bg-card',      t.bgCard);
  if (t.bgSecondary) r.style.setProperty('--bg-secondary', t.bgSecondary);
  sessionStorage.setItem(SESSION_KEY, String(index));

  var dot = document.getElementById('theme-dot');
  if (dot) dot.style.background = t.accent;

  var btn = document.getElementById('theme-btn');
  if (btn) btn.title = 'Theme: ' + t.name + ' \u2014 click to change';
}

function initTheme() {
  var stored = sessionStorage.getItem(SESSION_KEY);
  var index = stored !== null
    ? parseInt(stored, 10)
    : Math.floor(Math.random() * THEMES.length);
  applyTheme(index);

  var btn = document.getElementById('theme-btn');
  if (btn) {
    btn.addEventListener('click', function () {
      var cur = parseInt(sessionStorage.getItem(SESSION_KEY) || '0', 10);
      applyTheme((cur + 1) % THEMES.length);
    });
  }
}

document.addEventListener('DOMContentLoaded', initTheme);
