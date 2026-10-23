(() => {
  const grid = document.getElementById('fw-video-grid');
  const status = document.getElementById('fw-video-status');
  if (!grid || !status) return;
  const pinnedId = grid.querySelector('[data-fw-pinned-video]')?.dataset.fwPinnedVideo;
  const fallback = () => {
    status.textContent = 'More recent videos are temporarily unavailable. Watch the full guide below or visit Fitness World on YouTube.';
  };
  fetch('/.netlify/functions/youtube-feed', { signal: AbortSignal.timeout(12000) })
    .then(response => {
      if (!response.ok) throw new Error('Feed unavailable');
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data.videos) || !data.videos.length) return fallback();
      const seen = new Set([pinnedId]);
      const videos = data.videos.filter(video => {
        if (!/^[\w-]{11}$/.test(video.id) || seen.has(video.id)) return false;
        seen.add(video.id);
        return true;
      }).slice(0, 2);
      if (!videos.length) return fallback();
      for (const video of videos) {
        const article = document.createElement('article');
        article.className = 'fw-video-card';
        article.dataset.fwFeedVideo = video.id;
        const link = document.createElement('a');
        link.href = `https://www.youtube.com/watch?v=${video.id}`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        const image = document.createElement('img');
        image.src = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
        image.alt = '';
        image.loading = 'lazy';
        image.width = 480;
        image.height = 270;
        const title = document.createElement('h3');
        title.textContent = video.title;
        link.append(image, title);
        const published = new Date(video.published);
        if (!Number.isNaN(published.getTime())) {
          const time = document.createElement('time');
          time.dateTime = published.toISOString();
          time.textContent = published.toLocaleDateString('en', {year:'numeric', month:'short', day:'numeric'});
          link.append(time);
        }
        article.append(link);
        grid.append(article);
      }
      status.hidden = true;
    }).catch(fallback);
})();
