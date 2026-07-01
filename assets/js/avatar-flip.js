/* Puddleford — player avatar flip
 * Each .avatar-flip alternates between the player's "self" and "character"
 * portrait roughly once a minute (randomised per-card so the grid doesn't
 * flip in lockstep). Hovering (or tapping on touch devices) always shows
 * the character face, and reverts on mouse-out.
 */
(function () {
  'use strict';

  var MIN_INTERVAL_MS = 45000;   // 45s
  var MAX_INTERVAL_MS = 90000;   // 90s (averages ~1 minute)

  function randomInterval() {
    return MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
  }

  function initCard(card) {
    // Only auto-flip cards that actually have both faces.
    var hasBack = !!card.querySelector('.avatar-flip__face--back img');
    if (!hasBack) return;

    function scheduleNext() {
      card._flipTimer = window.setTimeout(function () {
        card.classList.toggle('is-character');
        scheduleNext();
      }, randomInterval());
    }

    // Stagger the very first flip too, so cards don't sync up.
    card._flipTimer = window.setTimeout(function () {
      card.classList.toggle('is-character');
      scheduleNext();
    }, randomInterval());

    // Touch devices have no :hover, so tap toggles the same is-character
    // class the auto-timer uses. This also pauses/resets the auto-timer
    // briefly so a tap doesn't get immediately undone by the scheduled flip.
    card.addEventListener('click', function () {
      if (window.matchMedia('(hover: hover)').matches) return; // desktop uses :hover
      window.clearTimeout(card._flipTimer);
      card.classList.toggle('is-character');
      scheduleNext();
    });
  }

  function init() {
    var cards = document.querySelectorAll('.avatar-flip');
    cards.forEach(initCard);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
