(function () {
  const frames = document.querySelectorAll('.page-frame');

  function showPage(key) {
    frames.forEach(f => {
      f.style.display = (f.dataset.page === key) ? 'block' : 'none';
    });
  }

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'navigate' && data.page) {
      showPage(data.page);
      window.scrollTo(0, 0);
      return;
    }

    if (data.type === 'resize' && typeof data.height === 'number') {
      const src = event.source;
      frames.forEach(f => {
        if (f.contentWindow === src) {
          if (!data.fixed) {
            f.style.height = Math.max(data.height, 400) + 'px';
          }
        }
      });
    }
  });
})();
