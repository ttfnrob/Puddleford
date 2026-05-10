/* ============================================================
   Puddleford — Episode loader
   Fetches RSS directly (anchor.fm sends Access-Control-Allow-Origin: *)
   Parses XML client-side. Falls back to CORS proxies if needed.
   ============================================================ */

const RSS_URL  = 'https://anchor.fm/s/10ce1465c/podcast/rss';
const CACHE_KEY = 'puddleford_episodes_v2';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/* ── Cache ─────────────────────────────────────────────────── */
function saveCache(items) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items })); } catch(e) {}
}
function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, items } = JSON.parse(raw);
    return (Date.now() - ts < CACHE_TTL) ? items : null;
  } catch(e) { return null; }
}

/* ── Fetch ─────────────────────────────────────────────────── */
async function fetchRSS() {
  // Try direct first (anchor.fm has CORS: *)
  const urls = [
    RSS_URL,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(RSS_URL)}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const text = await res.text();
      if (text.includes('<channel')) return text;
    } catch(e) { continue; }
  }
  throw new Error('Could not fetch RSS');
}

/* ── Parse ─────────────────────────────────────────────────── */
function parseRSS(xmlText) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(xmlText, 'text/xml');

  const parseErr = doc.querySelector('parsererror');
  if (parseErr) throw new Error('RSS parse error: ' + parseErr.textContent);

  const ITUNES = 'http://www.itunes.com/dtds/podcast-1.0.dtd';

  function ns(el, localName) {
    // Try namespace-aware first, fall back to prefixed tag name
    let found = el.getElementsByTagNameNS(ITUNES, localName)[0];
    if (!found) found = el.querySelector(`itunes\\:${localName}, [localName="${localName}"]`);
    return found ? found.textContent.trim() : '';
  }

  function tag(el, name) {
    const child = el.getElementsByTagName(name)[0];
    if (!child) return '';
    // For <link>, text may be in a text node (not textContent if CDATA)
    return (child.textContent || child.innerHTML || '').trim();
  }

  return Array.from(doc.querySelectorAll('channel > item')).map(item => {
    const imgEl = item.getElementsByTagNameNS(ITUNES, 'image')[0];
    const thumbnail = imgEl ? (imgEl.getAttribute('href') || imgEl.textContent.trim()) : '';
    const pubDate = tag(item, 'pubDate');

    // Infer season from publication year if not tagged in feed
    // Season 1 = 2025, Season 2 = 2026, and so on
    let season = ns(item, 'season');
    if (!season && pubDate) {
      const year = new Date(pubDate).getFullYear();
      if (year === 2025) season = '1';
      else if (year === 2026) season = '2';
      else if (year >= 2027) season = String(year - 2024);
    }

    return {
      title:           tag(item, 'title'),
      link:            tag(item, 'link'),
      guid:            tag(item, 'guid'),
      pubDate,
      description:     tag(item, 'description'),
      thumbnail,
      itunes_duration: ns(item, 'duration'),
      itunes_season:   season,
      itunes_episode:  ns(item, 'episode'),
    };
  });
}

/* ── Helpers ───────────────────────────────────────────────── */
function stripHtml(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  return (d.textContent || d.innerText || '').trim();
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ── Card builder ──────────────────────────────────────────── */
function buildCard(item) {
  const title  = item.title  || 'Untitled';
  const desc   = stripHtml(item.description).slice(0, 220);
  const img    = item.thumbnail || '';
  const link   = item.link   || '#';
  const season = item.itunes_season  || '';
  const dur    = item.itunes_duration || '';
  const date   = formatDate(item.pubDate);

  const guid = item.guid || '';
  const epPageUrl = 'episode.html?id=' + encodeURIComponent(guid);

  const card = document.createElement('a');
  card.className   = 'episode-card card';
  card.href        = epPageUrl;
  card.dataset.season = season || '0';

  card.innerHTML = `
    <div class="card-img-wrap">
      ${img
        ? `<img class="card-img" src="${img}" alt="" loading="lazy">`
        : `<div class="card-img" style="background:var(--bg-secondary);display:flex;align-items:center;justify-content:center;color:var(--border-gold);font-size:1.2rem">Puddleford</div>`
      }
      ${season ? `<span class="badge">S${season}</span>` : ''}
    </div>
    <div class="card-body">
      <div class="card-title">${title}</div>
      <div class="card-meta">${date}${dur ? ' &middot; ' + dur : ''}</div>
      <div class="card-desc">${desc}</div>
      ${link ? `<span class="episode-card__spotify" onclick="event.preventDefault();event.stopPropagation();window.open('${link}','_blank')">Listen on Spotify</span>` : ''}
    </div>`;
  return card;
}

/* ── Filter ────────────────────────────────────────────────── */
function applyFilter(season) {
  document.querySelectorAll('.episode-card').forEach(c => {
    c.style.display = (season === 'all' || c.dataset.season === season) ? '' : 'none';
  });
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === season);
  });
}

/* ── Render ────────────────────────────────────────────────── */
function renderEpisodes(items, gridEl, latestEl) {
  if (!items || !items.length) return;

  if (latestEl) {
    const ep     = items[0];
    const desc   = stripHtml(ep.description).slice(0, 300);
    const season = ep.itunes_season;
    latestEl.innerHTML = `
      ${ep.thumbnail ? `<img class="latest-episode__img" src="${ep.thumbnail}" alt="" loading="lazy">` : ''}
      <div class="latest-episode__body">
        <div class="latest-episode__label">${season ? 'Season ' + season + ' &middot; ' : ''}Latest Episode</div>
        <h3 class="latest-episode__title">${ep.title}</h3>
        <div class="latest-episode__meta">${formatDate(ep.pubDate)}${ep.itunes_duration ? ' &middot; ' + ep.itunes_duration : ''}</div>
        <p class="latest-episode__desc">${desc}</p>
        <a href="${ep.link || '#'}" target="_blank" rel="noopener" class="btn btn--gold">Listen now</a>
      </div>`;
  }

  if (gridEl) {
    gridEl.innerHTML = '';
    items.forEach(item => gridEl.appendChild(buildCard(item)));
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
    });
    applyFilter('all');
  }
}

/* ── Main ──────────────────────────────────────────────────── */
async function loadEpisodes(gridEl, latestEl) {
  // Show cached immediately
  const cached = loadCache();
  if (cached && cached.length) renderEpisodes(cached, gridEl, latestEl);

  // Fetch fresh
  try {
    const xml   = await fetchRSS();
    const items = parseRSS(xml);
    if (!items.length) throw new Error('No items parsed');
    saveCache(items);
    renderEpisodes(items, gridEl, latestEl);
  } catch(err) {
    console.error('[Puddleford] Episode load failed:', err);
    if (!cached || !cached.length) {
      const msg = '<div class="error-state">Could not load episodes. <a href="https://open.spotify.com/show/1MhWw8jOD7L36ayZKyHTmd" target="_blank" rel="noopener">Listen on Spotify</a></div>';
      if (gridEl)   gridEl.innerHTML = msg;
      if (latestEl) latestEl.innerHTML = msg;
    }
  }
}
