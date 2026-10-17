(function () {
  'use strict';
  document.querySelectorAll('[data-fw-short]').forEach(function (section) {
    const button = section.querySelector('.fw-short__play');
    const videoId = section.dataset.fwShort;
    if (!button || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return;
    const thumbnail = button.querySelector('img');
    function showPoster() {
      if (button.classList.contains('fw-short__play--fallback')) return;
      thumbnail.hidden = true;
      button.classList.add('fw-short__play--fallback');
      const poster = document.createElement('span');
      poster.className = 'fw-short__poster';
      poster.setAttribute('aria-hidden', 'true');
      poster.textContent = section.querySelector('.fw-short__title').textContent;
      button.prepend(poster);
    }
    if (thumbnail) {
      thumbnail.addEventListener('error', showPoster, { once: true });
      if (thumbnail.complete && !thumbnail.naturalWidth) showPoster();
    }
    button.addEventListener('click', function () {
      const frame = document.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/' + videoId + '?autoplay=1&playsinline=1&rel=0';
      frame.title = section.querySelector('.fw-short__title').textContent;
      frame.width = section.classList.contains('fw-short--full') ? '640' : '320';
      frame.height = section.classList.contains('fw-short--full') ? '360' : '569';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      button.replaceWith(frame);
      frame.focus();
    }, { once: true });
  });
})();
