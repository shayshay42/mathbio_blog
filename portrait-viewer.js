// The portrait is a rendered illustration on a CSS plane. Hand-drawn math
// sits on separate depth planes; no WebGL or continuous animation is needed.
document.querySelectorAll('.portrait-view').forEach(mountPortrait);

function mountPortrait(host) {
  const scene = host.querySelector('.portrait-scene');
  if (!scene) return;
  const link = host.closest('a');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const current = { x: 0, y: 0 };
  let target = { x: 0, y: 0 };
  let frame = 0;
  let visible = true;

  function apply() {
    scene.style.setProperty('--portrait-x', `${current.x.toFixed(3)}deg`);
    scene.style.setProperty('--portrait-y', `${current.y.toFixed(3)}deg`);
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    host.classList.remove('is-tilting');
  }
  function settle() {
    stop();
    current.x = current.y = 0;
    target = { x: 0, y: 0 };
    apply();
  }
  function requestRender() {
    if (frame || !visible || document.hidden || reducedMotion.matches) return;
    host.classList.add('is-tilting');
    frame = requestAnimationFrame(render);
  }
  function render() {
    frame = 0;
    if (!visible || document.hidden || reducedMotion.matches) { settle(); return; }
    current.x += (target.x - current.x) * .22;
    current.y += (target.y - current.y) * .22;
    const moving = Math.abs(target.x - current.x) + Math.abs(target.y - current.y) > .008;
    if (!moving) { current.x = target.x; current.y = target.y; }
    apply();
    if (moving) requestRender();
    else host.classList.remove('is-tilting');
  }
  function restingTarget() {
    return link?.matches(':focus-visible') ? { x: -1.4, y: 2.2 } : { x: 0, y: 0 };
  }
  function reset() {
    if (reducedMotion.matches) { settle(); return; }
    target = restingTarget();
    requestRender();
  }

  host.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || reducedMotion.matches || !visible) return;
    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(-.5, Math.min(.5, (event.clientX - rect.left) / rect.width - .5));
    const y = Math.max(-.5, Math.min(.5, (event.clientY - rect.top) / rect.height - .5));
    target = { x: -y * 6, y: x * 8 };
    requestRender();
  });
  host.addEventListener('pointerleave', reset);
  // Focus remains the native LinkedIn link; decoration adds no extra tab stop.
  link?.addEventListener('focus', reset);
  link?.addEventListener('blur', () => { target = { x: 0, y: 0 }; requestRender(); });
  reducedMotion.addEventListener('change', settle);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) settle();
    else reset();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) reset();
      else settle();
    }).observe(host);
  }
}
