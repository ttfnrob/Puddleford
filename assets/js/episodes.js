/* ============================================================
   Puddleford — Episode loader
   Fetches RSS feed directly via corsproxy.io, parses XML client-side.
   Falls back to allorigins.win if first proxy fails.
   ============================================================ */

const RSS_URL = 'https://anchor.fm/s/10ce1465c/podcast/rss';
const PROXIES = [
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

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
    const xml = await fetchRSS();
    const items = parseRSS(xml);

    if (!items.length) throw new Error('No episodes parsed');

    // Latest episode widget (homepage)
    if (latestEl && items.length) {
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

  } catch(err) {
    console.error('Episode load error:', err);
    const msg = `<div class="error-state">Could not load episodes. <a href="https://open.spotify.com/show/1MhWw8jOD7L36ayZKyHTmd" target="_blank" rel="noopener">Listen on Spotify</a></div>`;
    if (gridEl)   gridEl.innerHTML = msg;
    if (latestEl) latestEl.innerHTML = msg;
  }
}
