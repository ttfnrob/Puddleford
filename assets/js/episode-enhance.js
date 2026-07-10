/* ============================================================
   Puddleford — Episode page progressive enhancement
   ============================================================
   The episode's own title/description/artwork/meta tags are now
   baked into the static HTML at build time (see
   scripts/generate_episode_pages.py) so social crawlers and search
   engines see the right thing without running JS.

   This script only adds the *extra* stuff that's fine to load
   client-side after the page is already visible and correct:
   speaking-time stats, wiki character/location cross-references,
   and the full transcript.

   Reads its target episode from the <script> tag's own
   data-guid / data-title attributes (set per-page by the generator).
   ============================================================ */
(function() {
  const scriptEl = document.currentScript;
  const guid = scriptEl && scriptEl.dataset.guid;
  const title = scriptEl && scriptEl.dataset.title;
  if (!guid || !title) return;

  // ── Stats & Speaking chart ──
  async function loadStats() {
    try {
      const indexRes = await fetch('/data/episode-stats/index.json');
      if (!indexRes.ok) return;
      const statsIndex = await indexRes.json();
      const statsPath = statsIndex[guid];
      if (!statsPath) return;

      const statsRes = await fetch('/' + statsPath);
      if (!statsRes.ok) return;
      const stats = await statsRes.json();
      if (!stats.speaking || !stats.speaking.length) return;

      const speaking = stats.speaking;
      const totalWords = speaking.reduce((s, c) => s + c.words, 0);
      const topChar = speaking[0];

      const bar = document.getElementById('ep-stats-section');
      bar.innerHTML =
        '<div class="ep-stat"><span class="ep-stat__label">Principal characters</span><span class="ep-stat__value">' + speaking.length + '</span></div>' +
        '<div class="ep-stat"><span class="ep-stat__label">Total words</span><span class="ep-stat__value">' + totalWords.toLocaleString() + '</span></div>' +
        '<div class="ep-stat"><span class="ep-stat__label">Most spoken</span><span class="ep-stat__value">' + topChar.name + ' (' + topChar.words + ')</span></div>';
      bar.style.display = 'flex';

      const maxWords = speaking[0].words;
      const top10 = speaking.slice(0, 10);
      const chartEl = document.getElementById('ep-speaking-chart');
      chartEl.innerHTML = top10.map(function(c) {
        const pct = Math.round((c.words / maxWords) * 100);
        return '<div class="ep-speaking__row">' +
          '<span class="ep-speaking__name">' + c.name + '</span>' +
          '<div class="ep-speaking__bar-track"><div class="ep-speaking__bar" style="width:' + pct + '%"></div></div>' +
          '<span class="ep-speaking__count">' + c.words + '</span>' +
          '</div>';
      }).join('');
      document.getElementById('ep-speaking-section').style.display = 'block';

    } catch(e) { console.warn('Stats load failed:', e); }
  }

  // ── Wiki data (characters & locations) ──
  async function loadWikiData() {
    try {
      const res = await fetch('/data/wiki.json');
      if (!res.ok) return;
      const wiki = await res.json();

      const chars = (wiki.characters || []).filter(function(c) {
        return c.episodes && c.episodes.some(function(ep) {
          return ep.toLowerCase() === title.toLowerCase();
        });
      });

      if (chars.length) {
        const grid = document.getElementById('ep-characters');
        grid.innerHTML = chars.map(function(c) {
          return '<div class="ep-card">' +
            '<div class="ep-card__name">' + c.name + '</div>' +
            '<div class="ep-card__desc">' + (c.description || '') + '</div>' +
            '<a href="/wiki.html#characters" class="ep-card__link">View in wiki</a>' +
            '</div>';
        }).join('');
        document.getElementById('ep-characters-section').style.display = 'block';

        const bar = document.getElementById('ep-stats-section');
        if (bar.style.display === 'flex') {
          const firstStat = bar.querySelector('.ep-stat');
          if (firstStat) firstStat.querySelector('.ep-stat__value').textContent = chars.length;
        }
      }

      const locs = (wiki.locations || []).filter(function(l) {
        return l.episodes && l.episodes.some(function(ep) {
          return ep.toLowerCase() === title.toLowerCase();
        });
      });

      if (locs.length) {
        const grid = document.getElementById('ep-locations');
        grid.innerHTML = locs.map(function(l) {
          return '<div class="ep-card">' +
            '<div class="ep-card__name">' + l.name + '</div>' +
            '<div class="ep-card__desc">' + (l.description || '') + '</div>' +
            '<a href="/wiki.html#locations" class="ep-card__link">View in wiki</a>' +
            '</div>';
        }).join('');
        document.getElementById('ep-locations-section').style.display = 'block';

        const bar = document.getElementById('ep-stats-section');
        if (bar.style.display === 'flex') {
          const locStat = document.createElement('div');
          locStat.className = 'ep-stat';
          locStat.innerHTML = '<span class="ep-stat__label">Locations</span><span class="ep-stat__value">' + locs.length + '</span>';
          bar.insertBefore(locStat, bar.children[1]);
        }
      }

    } catch(e) { console.warn('Wiki load failed:', e); }
  }

  // ── Transcript ──
  async function loadTranscript() {
    try {
      const indexRes = await fetch('/data/transcripts/index.json');
      if (!indexRes.ok) return;
      const index = await indexRes.json();
      const entry = index[guid];
      if (!entry || !entry.file) return;

      const filePath = entry.file.startsWith('/') ? entry.file : '/' + entry.file;
      const textRes = await fetch(filePath);
      if (!textRes.ok) return;
      const text = await textRes.text();
      if (!text.trim()) return;

      document.getElementById('ep-transcript-text').textContent = text;
      document.getElementById('ep-transcript-section').style.display = 'block';

      const wrap = document.getElementById('ep-transcript-wrap');
      const btn = document.getElementById('ep-transcript-toggle');
      const isMobile = window.innerWidth < 768;

      if (isMobile) {
        wrap.classList.add('ep-transcript--collapsed');
        btn.textContent = 'Read transcript';
      } else {
        wrap.classList.remove('ep-transcript--collapsed');
        btn.textContent = 'Hide transcript';
      }

      btn.addEventListener('click', function() {
        const collapsed = wrap.classList.toggle('ep-transcript--collapsed');
        btn.textContent = collapsed ? 'Read transcript' : 'Hide transcript';
        if (!collapsed) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

    } catch(e) { console.warn('Transcript load failed:', e); }
  }

  loadStats();
  loadWikiData();
  loadTranscript();
})();
