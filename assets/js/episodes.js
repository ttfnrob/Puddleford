/* ============================================================
   Puddleford — Episode loader
   Fetches RSS feed directly via corsproxy.io, parses XML client-side.
   Falls back to allorigins.win if first proxy fails.
   ============================================================ */

const RSS_URL = 'https://anchor.fm/s/10ce1465c/podcast/rss';
const PROXIES = [
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  url => `https://thingproxy.freeboard.io/fetch/${url}`,
];
const CACHE_KEY = 'puddleford_episodes';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function saveCache(items) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items }));
  } catch(e) {}
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, items } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL) return items;
    return null; // stale
  } catch(e) { return null; }
}

function stripHtml(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  return (d.textContent || d.innerText || '').trim();
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getText(el, tag, ns) {
  const child = ns ? el.getElementsByTagNameNS(ns, tag)[0] : el.getElementsByTagName(tag)[0];
  return child ? (child.textContent || '').trim() : '';
}

function parseRSS(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const items = Array.from(doc.querySelectorAll('item'));
  const ITUNES = 'http://www.itunes.com/dtds/podcast-1.0.dtd';

  return items.map(item => {
    const enclosure = item.querySelector('enclosure');
    const itunesImage = item.getElementsByTagNameNS(ITUNES, 'image')[0];
    const thumbnail = itunesImage ? itunesImage.getAttribute('href') : '';

    return {
      title:        getText(item, 'title'),
      link:         getText(item, 'link') || (item.querySelector('enclosure') ? '' : ''),
      guid:         getText(item, 'guid'),
      pubDate:      getText(item, 'pubDate'),
      description:  getText(item, 'description'),
      thumbnail,
      itunes_duration: item.getElementsByTagNameNS(ITUNES, 'duration')[0]?.textContent?.trim() || '',
      itunes_season:   item.getElementsByTagNameNS(ITUNES, 'season')[0]?.textContent?.trim() || '',
      itunes_episode:  item.getElementsByTagNameNS(ITUNES, 'episode')[0]?.textContent?.trim() || '',
    };
  });
}

async function fetchRSS() {
  for (const proxyFn of PROXIES) {
    try {
      const res = await fetch(proxyFn(RSS_URL));
      if (!res.ok) continue;
      const text = await res.text();
      if (!text.includes('<rss') && !text.includes('<channel')) continue;
      return text;
    } catch(e) {
      continue;
    }
  }
  throw new Error('All proxies failed');
}

function buildCard(item) {
  const title = item.title || 'Untitled';
  const date  = item.pubDate ? formatDate(item.pubDate) : '';
  const desc  = stripHtml(item.description).slice(0, 220);
  const img   = item.thumbnail || '';
  const link  = item.link || '#';
  const season = item.itunes_season || '';
  const dur   = item.itunes_duration || '';

  const card = document.createElement('a');
  card.className = 'episode-card card';
  card.href = link || '#';
  if (link) { card.target = '_blank'; card.rel = 'noopener'; }
  card.dataset.season = season || '0';

  card.innerHTML = `
    ${img
      ? `<img class="card-img" src="${img}" alt="${title}" loading="lazy">`
      : `<div class="card-img" style="background:var(--bg-secondary);aspect-ratio:1;display:flex;align-items:center;justify-content:center;color:var(--border-gold);font-size:2rem">[ ]</div>`
    }
    <div class="card-body">
      ${season ? `<span class="badge">S${season}</span>` : ''}
      <div class="card-title">${title}</div>
      <div class="card-meta">${date}${dur ? ' &middot; ' + dur : ''}</div>
      <div class="card-desc">${desc}</div>
    </div>
  `;
  return card;
}

let activeFilter = 'all';

function applyFilter(season) {
  activeFilter = season;
  document.querySelectorAll('.episode-card').forEach(card => {
    card.style.display = (season === 'all' || card.dataset.season === season) ? '' : 'none';
  });
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === season);
  });
}

async function loadEpisodes(gridEl, latestEl) {
  try {
    // Try cache first — render immediately, then refresh in background
    const cached = loadCache();
    if (cached && cached.length) {
      renderEpisodes(cached, gridEl, latestEl);
    }

    // Fetch fresh data
    let items;
    try {
      const xml = await fetchRSS();
      items = parseRSS(xml);
      if (!items.length) throw new Error('No episodes parsed');
      saveCache(items);
    } catch(fetchErr) {
      // If fetch failed but we had cache, silently stay on cached version
      if (cached && cached.length) return;
      throw fetchErr;
    }

    renderEpisodes(items, gridEl, latestEl);

  }
}

function renderEpisodes(items, gridEl, latestEl) {
  if (!items.length) return;

    // Latest episode widget (homepage)
    if (latestEl) {
      const ep = items[0];
      const desc = stripHtml(ep.description).slice(0, 300);
      const season = ep.itunes_season;
      latestEl.innerHTML = `
        ${ep.thumbnail
          ? `<img src="${ep.thumbnail}" alt="${ep.title}" loading="lazy">`
          : `<div style="width:180px;height:180px;background:var(--bg-secondary);display:flex;align-items:center;justify-content:center;border-radius:6px;color:var(--border-gold);font-size:2rem">[ ]</div>`
        }
        <div>
          ${season ? `<span class="badge">Season ${season}</span>` : ''}
          <h3>${ep.title}</h3>
          <div class="ep-meta">${ep.pubDate ? formatDate(ep.pubDate) : ''}${ep.itunes_duration ? ' &middot; ' + ep.itunes_duration : ''}</div>
          <p>${desc}</p>
          <a href="${ep.link || '#'}" target="_blank" rel="noopener" class="btn btn-primary">Listen now</a>
        </div>
      `;
    }

    // Full episode grid
    if (gridEl) {
      gridEl.innerHTML = '';
      items.forEach(item => gridEl.appendChild(buildCard(item)));

      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
      });
      applyFilter('all');
    }

  }
}
