(function () {
  'use strict';
  document.querySelectorAll('[data-fw-short]').forEach(function (section) {
    const button = section.querySelector('.fw-short__play');
    const videoId = section.dataset.fwShort;
    if (!button || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return;
    button.addEventListener('click', function () {
      const frame = document.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/' + videoId + '?autoplay=1&playsinline=1&rel=0';
      frame.title = section.querySelector('.fw-short__title').textContent;
      frame.width = '320';
      frame.height = '569';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      button.replaceWith(frame);
      frame.focus();
    }, { once: true });
  });
})();
