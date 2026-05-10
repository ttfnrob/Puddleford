/**
 * Puddleford — episodes.js
 * Fetches podcast episodes from RSS via rss2json.
 * Powers episode grid on episodes.html and latest episode widget on index.html.
 */

const RSS_API = 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fanchor.fm%2Fs%2F10ce1465c%2Fpodcast%2Frss&count=100';

// ── Helpers ──

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function truncate(text, maxLen) {
  maxLen = maxLen || 160;
  const clean = stripHtml(text).trim();
  return clean.length > maxLen ? clean.slice(0, maxLen).trimEnd() + '\u2026' : clean;
}

function formatDuration(secs) {
  if (!secs) return '';
  secs = parseInt(secs, 10);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return h + 'h ' + m + 'm';
  if (m > 0) return m + 'm';
  return secs + 's';
}

function getSeason(item) {
  if (item.itunes_season) return parseInt(item.itunes_season, 10);
  if (item.itunes_episode) return parseInt(item.itunes_episode, 10) <= 12 ? 1 : 2;
  return 1;
}

function buildEpisodeCard(item, season, epNum, fallbackImg) {
  var img = item.thumbnail || fallbackImg;
  var link = item.link || 'https://open.spotify.com/show/1MhWw8jOD7L36ayZKyHTmd';
  var dur = formatDuration(item.itunes_duration);
  var date = formatDate(item.pubDate);
  var desc = truncate(item.description || item.content || '', 150);
  var label = epNum ? ('S' + season + ' E' + (epNum < 10 ? '0' + epNum : epNum)) : ('Season ' + season);

  var card = document.createElement('article');
  card.className = 'card';
  card.dataset.season = season;

  card.innerHTML =
    '<img class="card__img" src="' + img + '" alt="' + item.title.replace(/"/g, '&quot;') + '" loading="lazy" onerror="this.src=\'' + fallbackImg + '\'">' +
    '<div class="card__body">' +
      '<span class="card__badge">' + label + '</span>' +
      '<h3 class="card__title">' + item.title + '</h3>' +
      '<p class="card__meta">' + date + (dur ? ' &nbsp;&middot;&nbsp; ' + dur : '') + '</p>' +
      '<p class="card__desc">' + desc + '</p>' +
      '<a class="card__link" href="' + link + '" target="_blank" rel="noopener">Listen on Spotify</a>' +
    '</div>';

  return card;
}

// ── Episodes page ──

async function initEpisodesPage() {
  var grid = document.getElementById('episode-grid');
  var filterBar = document.getElementById('filter-bar');
  if (!grid) return;

  var fallbackImg = 'assets/img/cover-with-title-1.jpg';
  grid.innerHTML = '<p class="loading-state">Loading episodes<span class="loading-dots"></span></p>';

  var feed;
  try {
    var res = await fetch(RSS_API);
    feed = await res.json();
  } catch (e) {
    grid.innerHTML = '<p class="empty-state">Could not load episodes. Please try again later.</p>';
    return;
  }

  if (!feed.items || feed.items.length === 0) {
    grid.innerHTML = '<p class="empty-state">No episodes found.</p>';
    return;
  }

  var items = feed.items; // newest first from rss2json
  var reversed = items.slice().reverse(); // oldest first
  var cards = [];

  reversed.forEach(function(item, idx) {
    var season = getSeason(item);
    var epNum = item.itunes_episode ? parseInt(item.itunes_episode, 10) : (idx + 1);
    var card = buildEpisodeCard(item, season, epNum, fallbackImg);
    cards.push({ card: card, season: season });
  });

  // Display newest first
  cards.reverse();

  grid.innerHTML = '';
  cards.forEach(function(c) { grid.appendChild(c.card); });

  // Season filter
  var seasons = [];
  cards.forEach(function(c) { if (seasons.indexOf(c.season) === -1) seasons.push(c.season); });
  seasons.sort(function(a, b) { return a - b; });

  if (filterBar && seasons.length > 0) {
    filterBar.innerHTML = '';

    var allBtn = document.createElement('button');
    allBtn.className = 'filter-btn active';
    allBtn.textContent = 'All Episodes';
    allBtn.dataset.season = 'all';
    filterBar.appendChild(allBtn);

    seasons.forEach(function(s) {
      var btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.textContent = 'Season ' + s;
      btn.dataset.season = s;
      filterBar.appendChild(btn);
    });

    filterBar.addEventListener('click', function(e) {
      var btn = e.target.closest('.filter-btn');
      if (!btn) return;
      filterBar.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var sel = btn.dataset.season;
      cards.forEach(function(c) {
        c.card.style.display = (sel === 'all' || c.season === parseInt(sel, 10)) ? '' : 'none';
      });
    });
  }

  var countEl = document.getElementById('episode-count');
  if (countEl) countEl.textContent = items.length;
}

// ── Latest episode widget (homepage) ──

async function initLatestEpisode() {
  var container = document.getElementById('latest-episode');
  if (!container) return;

  var fallbackImg = 'assets/img/cover-with-title-1.jpg';
  container.innerHTML = '<p class="loading-state" style="padding:2rem;">Loading latest episode<span class="loading-dots"></span></p>';

  var feed;
  try {
    var res = await fetch(RSS_API);
    feed = await res.json();
  } catch (e) {
    container.innerHTML = '<p class="empty-state">Could not load episode info.</p>';
    return;
  }

  if (!feed.items || feed.items.length === 0) {
    container.innerHTML = '<p class="empty-state">No episodes found.</p>';
    return;
  }

  var item = feed.items[0];
  var img = item.thumbnail || fallbackImg;
  var link = item.link || 'https://open.spotify.com/show/1MhWw8jOD7L36ayZKyHTmd';
  var date = formatDate(item.pubDate);
  var dur = formatDuration(item.itunes_duration);
  var desc = truncate(item.description || item.content || '', 220);

  container.innerHTML =
    '<img class="latest-episode__img" src="' + img + '" alt="' + item.title.replace(/"/g, '&quot;') + '" onerror="this.src=\'' + fallbackImg + '\'">' +
    '<div class="latest-episode__body">' +
      '<p class="latest-episode__label">&#x1F399;&#xFE0F; Latest Episode</p>' +
      '<h3 class="latest-episode__title">' + item.title + '</h3>' +
      '<p class="latest-episode__meta">' + date + (dur ? ' &middot; ' + dur : '') + '</p>' +
      '<p class="latest-episode__desc">' + desc + '</p>' +
      '<a class="btn btn--gold" href="' + link + '" target="_blank" rel="noopener">&#9654; Listen now</a>' +
    '</div>';
}

// ── Init ──

document.addEventListener('DOMContentLoaded', function() {
  initLatestEpisode();
  initEpisodesPage();
});
