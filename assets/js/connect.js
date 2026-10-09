(() => {
  const grid = document.getElementById('fw-video-grid');
  const status = document.getElementById('fw-video-status');
  if (!grid || !status) return;
  const fallback = () => {
    status.textContent = 'Our latest videos will appear here when available. You can also visit Fitness World on YouTube.';
  };
  fetch('/.netlify/functions/youtube-feed', { signal: AbortSignal.timeout(12000) })
    .then(response => {
      if (!response.ok) throw new Error('Feed unavailable');
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data.videos) || !data.videos.length) return fallback();
      const videos = data.videos.filter(video => /^[\w-]{11}$/.test(video.id)).slice(0, 3);
      if (!videos.length) return fallback();
      for (const video of videos) {
        const article = document.createElement('article');
        article.className = 'fw-video-card';
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
