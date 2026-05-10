/* Platform badge HTML - used across site */
const PLATFORM_BADGES = `
<div class="platform-badges">

  <a href="https://open.spotify.com/show/1MhWw8jOD7L36ayZKyHTmd"
     target="_blank" rel="noopener"
     class="platform-badge platform-badge--spotify"
     aria-label="Listen on Spotify">
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.332a.75.75 0 01-1.031.25c-2.824-1.726-6.376-2.116-10.564-1.16a.75.75 0 11-.333-1.463c4.583-1.045 8.516-.595 11.678 1.342a.75.75 0 01.25 1.031zm1.472-3.27a.938.938 0 01-1.289.308c-3.232-1.987-8.158-2.563-11.982-1.403a.938.938 0 01-.546-1.795c4.368-1.328 9.796-.685 13.509 1.6a.938.938 0 01.308 1.29zm.126-3.405C15.27 8.42 9.24 8.222 5.87 9.244a1.125 1.125 0 01-.651-2.152c3.91-1.183 10.404-.954 14.511 1.71a1.125 1.125 0 01-1.216 1.905z"/>
    </svg>
    <span>Listen on Spotify</span>
  </a>

  <a href="https://podcasts.apple.com/podcast/puddleford/id1799546935"
     target="_blank" rel="noopener"
     class="platform-badge platform-badge--apple"
     aria-label="Listen on Apple Podcasts">
    <img src="assets/img/badges/apple-podcasts.svg" alt="Listen on Apple Podcasts" />
  </a>

  <a href="https://pca.st/podcast/54648910-c521-013d-5494-0affc0b4f80b"
     target="_blank" rel="noopener"
     class="platform-badge platform-badge--pocketcasts"
     aria-label="Listen on Pocket Casts">
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm0 4.129c4.345 0 7.871 3.526 7.871 7.871 0 4.344-3.526 7.871-7.871 7.871A7.872 7.872 0 014.13 12c0-4.345 3.525-7.871 7.87-7.871zm0 2.75A5.125 5.125 0 006.88 12a5.125 5.125 0 005.12 5.121 5.125 5.125 0 005.121-5.12A5.125 5.125 0 0012 6.879zm0 2.377a2.748 2.748 0 012.744 2.744A2.748 2.748 0 0112 14.744 2.748 2.748 0 019.256 12 2.748 2.748 0 0112 9.256zm3.892-1.635a.87.87 0 110 1.739.87.87 0 010-1.739z"/>
    </svg>
    <span>Pocket Casts</span>
  </a>

  <a href="https://anchor.fm/s/10ce1465c/podcast/rss"
     target="_blank" rel="noopener"
     class="platform-badge platform-badge--rss"
     aria-label="RSS Feed">
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6.18 15.64a2.18 2.18 0 012.18 2.18C8.36 19.01 7.38 20 6.18 20C4.98 20 4 19.01 4 17.82a2.18 2.18 0 012.18-2.18M4 4.44A15.56 15.56 0 0119.56 20h-2.83A12.73 12.73 0 004 7.27V4.44m0 5.66a9.9 9.9 0 019.9 9.9h-2.83A7.07 7.07 0 004 12.93V10.1z"/>
    </svg>
    <span>RSS Feed</span>
  </a>

</div>
`;

// Inject badges into any element with data-badges attribute
document.querySelectorAll('[data-badges]').forEach(el => {
  el.innerHTML = PLATFORM_BADGES;
});
