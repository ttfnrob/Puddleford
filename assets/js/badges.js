/* ============================================================
   Puddleford — Platform badges
   Official badge assets used where available:
     - Apple Podcasts: official badge from tools.applemediaservices.com
     - Pocket Casts: official badge from pocketcasts.com/pocketcasts_badges.zip
     - Spotify: branded pill (no official downloadable badge published)
     - RSS: standard RSS orange
   All badges normalised to 40px height.
   ============================================================ */

const BADGES_HTML = `
<div class="platform-badges">

  <a href="https://open.spotify.com/show/1MhWw8jOD7L36ayZKyHTmd"
     target="_blank" rel="noopener noreferrer"
     class="pbadge pbadge--spotify"
     aria-label="Listen on Spotify">
    <span class="pbadge__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.332a.75.75 0 01-1.031.25c-2.824-1.726-6.376-2.116-10.564-1.16a.75.75 0 11-.333-1.463c4.583-1.045 8.516-.595 11.678 1.342a.75.75 0 01.25 1.031zm1.472-3.27a.938.938 0 01-1.289.308c-3.232-1.987-8.158-2.563-11.982-1.403a.938.938 0 01-.546-1.795c4.368-1.328 9.796-.685 13.509 1.6a.938.938 0 01.308 1.29zm.126-3.405C15.27 8.42 9.24 8.222 5.87 9.244a1.125 1.125 0 01-.651-2.152c3.91-1.183 10.404-.954 14.511 1.71a1.125 1.125 0 01-1.216 1.905z"/>
      </svg>
    </span>
    <span class="pbadge__label">Spotify</span>
  </a>

  <a href="https://podcasts.apple.com/podcast/puddleford/id1799546935"
     target="_blank" rel="noopener noreferrer"
     class="pbadge pbadge--img"
     aria-label="Listen on Apple Podcasts">
    <img src="assets/img/badges/apple-podcasts.svg"
         alt="Listen on Apple Podcasts"
         height="40" />
  </a>

  <a href="https://pca.st/podcast/54648910-c521-013d-5494-0affc0b4f80b"
     target="_blank" rel="noopener noreferrer"
     class="pbadge pbadge--img"
     aria-label="Listen on Pocket Casts">
    <img src="assets/img/badges/pocketcasts-small-dark.svg"
         alt="Listen on Pocket Casts"
         height="40" />
  </a>

  <a href="https://anchor.fm/s/10ce1465c/podcast/rss"
     target="_blank" rel="noopener noreferrer"
     class="pbadge pbadge--rss"
     aria-label="RSS Feed">
    <span class="pbadge__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M6.18 15.64a2.18 2.18 0 012.18 2.18C8.36 19.01 7.38 20 6.18 20 4.98 20 4 19.01 4 17.82a2.18 2.18 0 012.18-2.18M4 4.44A15.56 15.56 0 0119.56 20h-2.83A12.73 12.73 0 004 7.27V4.44m0 5.66a9.9 9.9 0 019.9 9.9h-2.83A7.07 7.07 0 004 12.93V10.1z"/>
      </svg>
    </span>
    <span class="pbadge__label">RSS Feed</span>
  </a>

</div>
`;

document.querySelectorAll('[data-badges]').forEach(el => {
  el.innerHTML = BADGES_HTML;
});
