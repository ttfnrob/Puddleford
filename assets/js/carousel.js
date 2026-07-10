/* ============================================================
   Puddleford — Homepage themed carousel
   ============================================================
   Shows 3 episodes below the "Latest Episode" hero, picked by a
   theme that rotates daily. Themes and the day's pick are both
   deterministic (based on today's date), so everyone sees the same
   thing on a given day and it's stable across a page refresh.

   Data sources (both static JSON, no RSS re-fetch needed):
     /data/episode-index.json  — one compact record per episode
                                  (title, thumbnail, link, pubDate,
                                  season, word/speaker stats), written
                                  by scripts/generate_episode_pages.py
     /data/wiki.json           — locations/characters with each one's
                                  list of episode titles, written by
                                  scripts/update_wiki.py

   Add a new theme by pushing a function onto THEMES — each one
   receives the shared context and returns either
   { label, sublabel, episodes } (episodes.length may be < 3, caller
   pads/truncates) or null if there isn't enough data for it today.
   ============================================================ */
(function() {

  function canonTitle(title) {
    // Mirrors _canon_episode_title() in scripts/update_wiki.py: strip a
    // trailing "(era)" suffix so title variants match (RSS titles are
    // sometimes edited to add/change an era suffix after the fact).
    return (title || '').replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
  }

  // Deterministic "random" pick based on today's date, so the same
  // theme (and the same episodes within it) show all day, everywhere,
  // then roll over at midnight.
  function dayOfYear(d) {
    const start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 86400000);
  }
  function seededShuffle(arr, seed) {
    const out = arr.slice();
    let s = seed;
    for (let i = out.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  function seededPick(arr, seed, n) {
    return seededShuffle(arr, seed).slice(0, n);
  }

  /* ── Theme definitions ────────────────────────────────────── */
  const THEMES = [

    function dogAndDuck(ctx) {
      const loc = ctx.wiki.locations.find(l => l.name === 'The Dog and Duck');
      if (!loc || !loc.episodes || !loc.episodes.length) return null;
      const eps = ctx.episodesByCanonTitle(loc.episodes);
      if (eps.length < 2) return null;
      return {
        label: 'Down the Dog and Duck',
        sublabel: 'Puddleford\u2019s one true constant. Every era, same questionable ale.',
        episodes: seededPick(eps, ctx.seed, 3),
      };
    },

    function mostVoices(ctx) {
      const ranked = ctx.episodes.filter(e => e.numSpeakers > 0)
        .slice().sort((a, b) => b.numSpeakers - a.numSpeakers);
      if (ranked.length < 3) return null;
      return {
        label: 'A full house',
        sublabel: 'The episodes packing the most voices into one room.',
        episodes: ranked.slice(0, 3),
      };
    },

    function wordiest(ctx) {
      const ranked = ctx.episodes.filter(e => e.totalWords > 0)
        .slice().sort((a, b) => b.totalWords - a.totalWords);
      if (ranked.length < 3) return null;
      return {
        label: 'Wordiest episodes',
        sublabel: 'When the Players just would not stop talking.',
        episodes: ranked.slice(0, 3),
      };
    },

    function characterSpotlight(ctx) {
      const recurring = ctx.wiki.characters
        .filter(c => c.episodes && c.episodes.length >= 2)
        .sort((a, b) => b.episodes.length - a.episodes.length);
      if (!recurring.length) return null;
      const pick = recurring[ctx.seed % recurring.length];
      const eps = ctx.episodesByCanonTitle(pick.episodes);
      if (eps.length < 2) return null;
      return {
        label: 'Character spotlight: ' + pick.name,
        sublabel: pick.description || ('Every episode featuring ' + pick.name + '.'),
        episodes: seededPick(eps, ctx.seed, 3),
      };
    },

    function locationSpotlight(ctx) {
      const candidates = ctx.wiki.locations
        .filter(l => l.name !== 'The Dog and Duck' && l.episodes && l.episodes.length >= 2)
        .sort((a, b) => b.episodes.length - a.episodes.length);
      if (!candidates.length) return null;
      const pick = candidates[ctx.seed % candidates.length];
      const eps = ctx.episodesByCanonTitle(pick.episodes);
      if (eps.length < 2) return null;
      return {
        label: 'Location spotlight: ' + pick.name,
        sublabel: pick.description || ('Every episode set at ' + pick.name + '.'),
        episodes: seededPick(eps, ctx.seed, 3),
      };
    },

    function smallGroupEra(ctx) {
      // "Small group episodes from a given era" — group episodes by
      // era (see eraGroup on each episode-index.json record, computed
      // in scripts/generate_episode_pages.py from wiki.json's
      // timeline), then only offer eras that have at least 2 episodes
      // with a modest cast size (a "small group" story rather than a
      // big ensemble piece).
      const SMALL_CAST_MAX = 6;
      const byEra = {};
      ctx.episodes.forEach(e => {
        if (!e.eraGroup || !e.numSpeakers || e.numSpeakers > SMALL_CAST_MAX) return;
        (byEra[e.eraGroup] = byEra[e.eraGroup] || []).push(e);
      });
      const keys = Object.keys(byEra).filter(k => byEra[k].length >= 2);
      if (!keys.length) return null;
      const key = keys[ctx.seed % keys.length];
      return {
        label: key + ': small-cast tales',
        sublabel: 'Intimate stories from ' + key.toLowerCase() + ', told by just a handful of voices.',
        episodes: seededPick(byEra[key], ctx.seed, 3),
      };
    },

    function narratorSpotlight(ctx) {
      // Groups episodes by the 'narrator' field on episode-index.json
      // (parsed from an explicit "Narrated by <Name>" credit in the RSS
      // description — see extract_narrator() in
      // scripts/generate_episode_pages.py). Only surfaces a narrator
      // once there are >=2 credited episodes for them; grows naturally
      // as more episode descriptions get a narrator credit added.
      const byNarrator = {};
      ctx.episodes.forEach(e => {
        if (!e.narrator) return;
        (byNarrator[e.narrator] = byNarrator[e.narrator] || []).push(e);
      });
      const names = Object.keys(byNarrator).filter(n => byNarrator[n].length >= 2);
      if (!names.length) return null;
      const name = names[ctx.seed % names.length];
      return {
        label: 'Narrated by ' + name,
        sublabel: 'The tales ' + name + ' has told us, in ' + name + '\u2019s own words.',
        episodes: seededPick(byNarrator[name], ctx.seed, 3),
      };
    },

  ];

  /* ── Rendering ─────────────────────────────────────────────── */
  function stripHtmlLocal(html) {
    const d = document.createElement('div');
    d.innerHTML = html || '';
    return (d.textContent || '').trim();
  }

  function buildCarouselCard(ep, slugMap) {
    const slug = ep.slug || (slugMap && slugMap[ep.guid]);
    const url = slug ? ('/episodes/' + slug + '/') : ('episode.html?id=' + encodeURIComponent(ep.guid || ''));
    const dateStr = ep.pubDate ? new Date(ep.pubDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const card = document.createElement('a');
    card.className = 'card carousel-card';
    card.href = url;
    card.innerHTML =
      '<img class="card__img" src="' + (ep.thumbnail || '') + '" alt="" loading="lazy">' +
      '<div class="card__body">' +
        '<span class="card__badge"' + (ep.season ? '' : ' style="visibility:hidden;"') + '>Season ' + (ep.season || '—') + '</span>' +
        '<div class="card__title">' + ep.title + '</div>' +
        '<div class="card__meta">' + dateStr + (ep.duration ? ' &middot; ' + ep.duration : '') + '</div>' +
      '</div>';
    return card;
  }

  async function loadJSON(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      return res.ok ? await res.json() : null;
    } catch (e) { return null; }
  }

  async function initCarousel(containerEl) {
    if (!containerEl) return;
    const [episodes, wiki, slugMap] = await Promise.all([
      loadJSON('/data/episode-index.json'),
      loadJSON('/data/wiki.json'),
      loadJSON('/data/episode-slugs.json'),
    ]);
    if (!episodes || !episodes.length || !wiki) { containerEl.style.display = 'none'; return; }

    const byCanon = new Map();
    episodes.forEach(e => byCanon.set(canonTitle(e.title), e));

    const today = new Date();
    const seed = dayOfYear(today);

    const ctx = {
      episodes,
      wiki,
      today,
      seed,
      episodesByCanonTitle: function(titles) {
        return (titles || [])
          .map(t => byCanon.get(canonTitle(t)))
          .filter(Boolean);
      },
    };

    // Try today's designated theme first; if it can't produce at least
    // 2 episodes (not enough data yet, e.g. a brand-new wiki category),
    // roll forward through the rest of the theme list deterministically
    // rather than showing nothing.
    let picked = null;
    for (let i = 0; i < THEMES.length; i++) {
      const themeIndex = (seed + i) % THEMES.length;
      const result = THEMES[themeIndex](ctx);
      if (result && result.episodes && result.episodes.length >= 2) {
        picked = result;
        break;
      }
    }
    if (!picked) { containerEl.style.display = 'none'; return; }

    const labelEl = containerEl.querySelector('[data-carousel-label]');
    const sublabelEl = containerEl.querySelector('[data-carousel-sublabel]');
    const gridEl = containerEl.querySelector('[data-carousel-grid]');
    if (labelEl) labelEl.textContent = picked.label;
    if (sublabelEl) sublabelEl.textContent = picked.sublabel || '';
    if (gridEl) {
      gridEl.innerHTML = '';
      const toShow = picked.episodes.slice(0, 3);
      toShow.forEach(ep => gridEl.appendChild(buildCarouselCard(ep, slugMap)));
      gridEl.setAttribute('data-count', String(toShow.length));
    }
    containerEl.style.display = '';
  }

  window.initPuddlefordCarousel = initCarousel;
})();
