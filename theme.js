(() => {
  const swatches = document.querySelectorAll('button[data-enamel]');
  function setEnamel(color) {
    if (!['red', 'blue', 'black'].includes(color)) return;
    document.documentElement.dataset.enamel = color;
    swatches.forEach(swatch => swatch.setAttribute('aria-pressed', String(swatch.dataset.enamel === color)));
    const sharpener = document.querySelector('.sharpener');
    if (sharpener) sharpener.alt = `An original illustration of a ${color} Carl Angel-5 pencil sharpener, with a chrome face, hand crank, and clear shavings drawer.`;
    try { localStorage.setItem('notebook-enamel', color); } catch { /* The theme still works when browser storage is unavailable. */ }
  }
  swatches.forEach(swatch => swatch.addEventListener('click', () => setEnamel(swatch.dataset.enamel)));
  try { setEnamel(localStorage.getItem('notebook-enamel') || 'red'); } catch { setEnamel('red'); }
})();
