(() => {
  const swatches = document.querySelectorAll('button[data-enamel]');
  const portrait = document.querySelector('.portrait-person');
  const portraitImages = new Map();
  let portraitRequest = 0;

  function setPortraitEnamel(color) {
    if (!portrait) return;
    const request = ++portraitRequest;
    const filename = color === 'blue' ? 'shayan-cutout.png' : `shayan-cutout-${color}.png`;
    const source = new URL(`assets/portrait/${filename}`, document.baseURI).href;
    const show = () => {
      if (request !== portraitRequest) return;
      portrait.src = source;
      portrait.alt = `Shayan in a ${color} fleece, cut out from his original photograph.`;
      portrait.dataset.enamel = color;
    };
    if (portrait.complete && portrait.naturalWidth > 0 && portrait.currentSrc === source) {
      show();
      return;
    }
    let ready = portraitImages.get(source);
    if (!ready) {
      const image = new Image();
      image.src = source;
      ready = image.decode().catch(error => {
        portraitImages.delete(source);
        throw error;
      });
      portraitImages.set(source, ready);
    }
    // Decode first, keeping the current photograph visible during loading or failure.
    ready.then(show, () => {});
  }

  function setEnamel(color) {
    if (!['red', 'blue', 'black', 'green'].includes(color)) return;
    document.documentElement.dataset.enamel = color;
    swatches.forEach(swatch => swatch.setAttribute('aria-pressed', String(swatch.dataset.enamel === color)));
    const sharpener = document.querySelector('.sharpener');
    if (sharpener) {
      sharpener.alt = `A cartoon-style ${color} Carl Angel-5 pencil sharpener, with a chrome face, rear hand crank, and clear shavings drawer.`;
      if (sharpener.hasAttribute('data-preview')) sharpener.src = `assets/angel-5-${color}.png`;
    }
    setPortraitEnamel(color);
    document.dispatchEvent(new CustomEvent('enamelchange', { detail: { color } }));
    try { localStorage.setItem('notebook-enamel', color); } catch { /* The theme still works when browser storage is unavailable. */ }
  }
  swatches.forEach(swatch => swatch.addEventListener('click', () => setEnamel(swatch.dataset.enamel)));
  try { setEnamel(localStorage.getItem('notebook-enamel') || 'red'); } catch { setEnamel('red'); }
})();
