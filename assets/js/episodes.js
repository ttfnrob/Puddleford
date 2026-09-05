/* ============================================================
   Puddleford — Episode loader
   Fetches RSS directly (anchor.fm sends Access-Control-Allow-Origin: *)
   Parses XML client-side. Falls back to CORS proxies if needed.
   ============================================================ */

const RSS_URL  = 'https://anchor.fm/s/10ce1465c/podcast/rss';
const CACHE_KEY = 'puddleford_episodes_v3';
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
// Rob appends " - A Puddleford Tale" to 2026 episode titles in Spotify
// for Podcasters for SEO (anchors "Puddleford" in the title for Apple/
// Spotify/Pocket Casts search). Valuable on those platforms; redundant
// on puddleford.com itself, where the show name is already everywhere
// on the page. Strip for on-site display only — mirrors
// strip_display_suffix() in scripts/generate_episode_pages.py.
function stripDisplaySuffix(title) {
  return (title || '').replace(/\s*-\s*A Puddleford Tale\s*$/i, '').trim();
}

function stripHtml(html) {
  if (!html) return '';
  // Insert a space at block-boundary tags first — textContent alone
  // glues adjacent paragraphs/lines together with no separator at all.
  const withGaps = html.replace(/<\s*br\s*\/?\s*>/gi, ' ').replace(/<\/\s*(p|div|li)\s*>/gi, ' ');
  const d = document.createElement('div');
  d.innerHTML = withGaps;
  return (d.textContent || d.innerText || '').replace(/\s+/g, ' ').trim();
}

// Every episode description starts with the same standing boilerplate
// ("Every episode of Puddleford is entirely improvised...") and ends
// with a narrator/players credit line. Strip both so what's left is
// just the synopsis, and drop a leading "This week:" label too.
const BOILERPLATE_RE = /^\s*Every episode of Puddleford is entirely improvised[^.]*\.\s*(?:We add sound effects[^.]*\.\s*)?/i;
const CREDIT_TAIL_RE = /\s*(?:This week'?s narrator is|The players are)\b.*$/i;
const THIS_WEEK_RE   = /^\s*This week:\s*/i;

function cleanSynopsis(html) {
  let text = stripHtml(html);
  text = text.replace(BOILERPLATE_RE, '');
  text = text.replace(CREDIT_TAIL_RE, '');
  text = text.replace(THIS_WEEK_RE, '');
  return text.trim();
}

// Truncate on a word boundary and add an ellipsis, rather than
// slicing mid-word/mid-sentence with nothing to show it was cut.
function truncateWords(text, maxLen) {
  if (!text || text.length <= maxLen) return text || '';
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim() + '\u2026';
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// itunes:duration on this feed is always HH:MM:SS (or MM:SS). Render
// as a short human string: "34 min", "1 hr 5 min", "45 sec".
function formatDuration(str) {
  if (!str) return '';
  const parts = String(str).split(':').map(n => parseInt(n, 10));
  let h = 0, m = 0, s = 0;
  if (parts.length === 3) [h, m, s] = parts;
  else if (parts.length === 2) [m, s] = parts;
  else if (parts.length === 1) [s] = parts;
  if (parts.some(isNaN)) return str;
  const totalMin = h * 60 + m;
  if (totalMin < 1) return s + ' sec';
  if (h > 0) return h + ' hr' + (m ? ' ' + m + ' min' : '');
  return m + ' min';
}

// Trailers/teasers are published as their own RSS items ("Next
// Episode Coming Soon: ...") running well under two minutes. They
// should never appear in the main grid or as the "latest episode".
const TRAILER_MAX_SECONDS = 120;
function durationToSeconds(str) {
  if (!str) return 0;
  const parts = String(str).split(':').map(n => parseInt(n, 10) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}
function isTrailer(item) {
  return durationToSeconds(item.itunes_duration) > 0
    && durationToSeconds(item.itunes_duration) < TRAILER_MAX_SECONDS;
}

/* ── Episode slug map (guid -> static page slug) ──────────────
   Static per-episode pages (episodes/<slug>/) carry the real, baked-in
   title/description/artwork so social crawlers see correct previews.
   Prefer linking straight to those; fall back to the old
   episode.html?id= query form (which itself now redirects to the
   static page once the slug map loads) if the map isn't available
   yet, e.g. for an episode published since the last site build. */
let _slugMapPromise = null;
function loadSlugMap() {
  if (!_slugMapPromise) {
    _slugMapPromise = fetch('/data/episode-slugs.json', { cache: 'no-store' })
      .then(res => res.ok ? res.json() : {})
      .catch(() => ({}));
  }
  return _slugMapPromise;
}
function episodePageUrl(guid, slugMap) {
  const slug = slugMap && slugMap[guid];
  return slug ? ('/episodes/' + slug + '/') : ('episode.html?id=' + encodeURIComponent(guid || ''));
}

/* ── Card builder ──────────────────────────────────────────── */
function buildCard(item, slugMap) {
  const title  = stripDisplaySuffix(item.title) || 'Untitled';
  const desc   = truncateWords(cleanSynopsis(item.description), 200);
  const img    = item.thumbnail || '';
  const link   = item.link   || '#';
  const season = item.itunes_season  || '';
  const dur    = formatDuration(item.itunes_duration);
  const date   = formatDate(item.pubDate);

  const guid = item.guid || '';
  const epPageUrl = episodePageUrl(guid, slugMap);

  // Whole card links through to the episode detail page (P4).
  // "Listen on Spotify" becomes a secondary action inside it, not
  // the only way in.
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
      <span class="episode-card__actions">
        <span class="episode-card__details">Episode details</span>
        ${link ? `<span class="episode-card__spotify" onclick="event.preventDefault();event.stopPropagation();window.open('${link}','_blank')">Listen on Spotify</span>` : ''}
      </span>
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
function renderEpisodes(items, gridEl, latestEl, slugMap) {
  if (!items || !items.length) return;

  // Trailers ("Next Episode Coming Soon: ...") are real RSS items but
  // should never appear in the grid or stand in as the "latest
  // episode" (C3).
  const realEpisodes = items.filter(item => !isTrailer(item));

  if (latestEl) {
    const ep = realEpisodes[0];
    if (!ep) return;
    const desc   = truncateWords(cleanSynopsis(ep.description), 300);
    const season = ep.itunes_season;
    const dur    = formatDuration(ep.itunes_duration);
    const epPageUrl = episodePageUrl(ep.guid, slugMap);
    latestEl.innerHTML = `
      ${ep.thumbnail ? `<img class="latest-episode__img" src="${ep.thumbnail}" alt="" loading="lazy">` : ''}
      <div class="latest-episode__body">
        <div class="latest-episode__label">${season ? 'Season ' + season + ' &middot; ' : ''}Latest Episode</div>
        <h3 class="latest-episode__title"><a href="${epPageUrl}">${stripDisplaySuffix(ep.title)}</a></h3>
        <div class="latest-episode__meta">${formatDate(ep.pubDate)}${dur ? ' &middot; ' + dur : ''}</div>
        <p class="latest-episode__desc">${desc}</p>
        <a href="${ep.link || '#'}" target="_blank" rel="noopener" class="btn btn--gold">Listen now</a>
        <a href="${epPageUrl}" class="btn btn--outline">Episode details</a>
      </div>`;
  }

  if (gridEl) {
    gridEl.innerHTML = '';
    realEpisodes.forEach(item => gridEl.appendChild(buildCard(item, slugMap)));
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
    });
    applyFilter('all');
  }
}

/* ── Main ──────────────────────────────────────────────────── */
async function loadEpisodes(gridEl, latestEl) {
  const slugMap = await loadSlugMap();

  // Show cached immediately
  const cached = loadCache();
  if (cached && cached.length) renderEpisodes(cached, gridEl, latestEl, slugMap);

  // Fetch fresh
  try {
    const xml   = await fetchRSS();
    const items = parseRSS(xml);
    if (!items.length) throw new Error('No items parsed');
    saveCache(items);
    renderEpisodes(items, gridEl, latestEl, slugMap);
  } catch(err) {
    console.error('[Puddleford] Episode load failed:', err);
    if (!cached || !cached.length) {
      const msg = '<div class="error-state">Could not load episodes. <a href="https://open.spotify.com/show/1MhWw8jOD7L36ayZKyHTmd" target="_blank" rel="noopener">Listen on Spotify</a></div>';
      if (gridEl)   gridEl.innerHTML = msg;
      if (latestEl) latestEl.innerHTML = msg;
    }
  }
}
