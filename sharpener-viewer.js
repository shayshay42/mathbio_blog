import * as THREE from './assets/vendor/three.module.js';
import { createSharpener } from './sharpener-model.js';

// A small, on-demand renderer: no idle animation or external asset requests.
const host = document.querySelector('.sharpener-view');
if (host) {
  try { mountSharpener(host); }
  catch (error) {
    console.warn('The sharpener uses its still preview because 3D is unavailable.', error);
  }
}

function mountSharpener(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xffffff, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-describedby', 'sharpener-help');
  canvas.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown Home Enter Space H B');

  const scene = new THREE.Scene();
  const model = createSharpener();
  scene.add(model.group);
  scene.add(new THREE.HemisphereLight(0xfff9ed, 0x747d85, 1.5));
  const key = new THREE.DirectionalLight(0xfff5e7, 2.8);
  key.position.set(-3, 5, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe9f2ff, 1.0);
  fill.position.set(4, 2, -3);
  scene.add(fill);

  function createEnvironment() {
    // Broad studio reflections give the enamel and chrome their rounded finish.
    const studio = new THREE.Scene();
    studio.add(new THREE.Mesh(new THREE.SphereGeometry(15, 24, 16), new THREE.MeshBasicMaterial({ color: 0x858b94, side: THREE.BackSide })));
    [[-5, 5, 6, 8, 5, 0xffffff], [5, 3, 2, 4, 7, 0xffffff], [0, 6, -5, 7, 4, 0xfff1d9]].forEach(([x, y, z, w, h, color]) => {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
      panel.position.set(x, y, z);
      panel.lookAt(0, 0, 0);
      studio.add(panel);
    });
    const pmrem = new THREE.PMREMGenerator(renderer);
    const result = pmrem.fromScene(studio, 0.05);
    pmrem.dispose();
    studio.traverse(object => {
      object.geometry?.dispose();
      object.material?.dispose();
    });
    return result;
  }
  let environment = createEnvironment();
  scene.environment = environment.texture;

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const context = shadowCanvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 10, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(49, 42, 32, .24)');
  gradient.addColorStop(0.55, 'rgba(49, 42, 32, .10)');
  gradient.addColorStop(1, 'rgba(49, 42, 32, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.157;
  scene.add(shadow);

  const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 50);
  const initial = { yaw: 0.72, pitch: 0.24 };
  let yaw = initial.yaw;
  let pitch = initial.pitch;
  let frame = 0;
  let visible = true;
  let contextLost = false;
  let turning = null;
  let drag = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const controls = document.querySelector('.sharpener-controls');
  const holderButton = controls.querySelector('[data-action="clamp"]');
  const drawerButton = controls.querySelector('[data-action="drawer"]');
  const turnButton = controls.querySelector('[data-action="turn"]');
  const status = document.querySelector('#sharpener-status');
  const slides = {
    clamp: { value: 0, target: 0, active: false, apply: model.setClampExtension },
    drawer: { value: 0, target: 0, active: false, apply: model.setDrawerExtension },
  };
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  host.dataset.clampOpen = 'false';
  host.dataset.drawerOpen = 'false';
  host.dataset.turning = 'false';

  function updateCamera() {
    camera.position.set(7 * Math.sin(yaw) * Math.cos(pitch), 7 * Math.sin(pitch), 7 * Math.cos(yaw) * Math.cos(pitch));
    camera.lookAt(0, 0.02, -0.15);
    camera.updateMatrixWorld();
  }

  // Test the first visible surface, including the shell, so a hidden handle
  // cannot be clicked through the body. Child meshes inherit their part's action.
  function pickAction(event) {
    if (contextLost) return null;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    updateCamera();
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(model.group, true).find(intersection => {
      for (let part = intersection.object; part; part = part.parent) {
        if (!part.visible) return false;
      }
      return true;
    });
    let part = hit?.object;
    while (part && part !== model.group) {
      if (part.userData.action) return part.userData.action;
      part = part.parent;
    }
    return null;
  }

  function clearHover() {
    delete canvas.dataset.part;
    canvas.removeAttribute('title');
  }

  function updateHover(event) {
    const action = pickAction(event);
    if (!action) { clearHover(); return; }
    canvas.dataset.part = action;
    canvas.title = action === 'clamp' ? (slides.clamp.target ? 'Close pencil holder' : 'Pull out pencil holder')
      : action === 'drawer' ? (slides.drawer.target ? 'Close shavings bin' : 'Pull out shavings bin') : 'Turn handle';
  }

  function requestRender() {
    if (!frame && visible && !contextLost && !document.hidden) frame = requestAnimationFrame(render);
  }
  function render(time) {
    frame = 0;
    if (contextLost || !visible || document.hidden) return;
    updateCamera();
    for (const slide of Object.values(slides)) {
      if (!slide.active) continue;
      const progress = Math.min((time - slide.start) / 420, 1);
      const eased = progress * progress * (3 - 2 * progress);
      slide.value = slide.from + (slide.target - slide.from) * eased;
      slide.apply(slide.value);
      if (progress === 1) slide.active = false;
    }
    if (turning) {
      const progress = Math.min((time - turning.start) / 1000, 1);
      const eased = progress * progress * (3 - 2 * progress);
      model.crank.rotation.z = turning.angle - Math.PI * 2 * eased;
      if (progress === 1) finishTurn();
    }
    renderer.render(scene, camera);
    if (turning || Object.values(slides).some(slide => slide.active)) requestRender();
  }

  function finishTurn() {
    if (!turning) return;
    model.crank.rotation.z = (turning.angle - Math.PI * 2) % (Math.PI * 2);
    turning = null;
    turnButton.disabled = false;
    host.dataset.turning = 'false';
    status.textContent = 'Handle turned.';
  }

  function turnHandle() {
    if (turning) return;
    if (reducedMotion.matches) {
      model.crank.rotation.z = (model.crank.rotation.z - Math.PI / 3) % (Math.PI * 2);
      status.textContent = 'Handle turned one step.';
    } else {
      turning = { start: performance.now(), angle: model.crank.rotation.z };
      turnButton.disabled = true;
      host.dataset.turning = 'true';
      status.textContent = 'Turning the handle.';
    }
    requestRender();
  }

  function toggleSlide(name) {
    const slide = slides[name];
    slide.target = slide.target ? 0 : 1;
    slide.from = slide.value;
    slide.start = performance.now();
    slide.active = !reducedMotion.matches;
    if (!slide.active) {
      slide.value = slide.target;
      slide.apply(slide.value);
    }
    const open = Boolean(slide.target);
    const button = name === 'clamp' ? holderButton : drawerButton;
    button.setAttribute('aria-pressed', String(open));
    button.setAttribute('aria-label', `${open ? 'Close' : 'Open'} ${name === 'clamp' ? 'pencil holder' : 'shavings bin'}`);
    host.dataset[name === 'clamp' ? 'clampOpen' : 'drawerOpen'] = String(open);
    status.textContent = name === 'clamp'
      ? (open ? 'Pencil holder open. Ready to load a pencil.' : 'Pencil holder closed.')
      : (open ? 'Shavings bin pulled out.' : 'Shavings bin closed.');
    clearHover();
    requestRender();
  }

  function activate(action) {
    if (contextLost) return;
    if (action === 'clamp' || action === 'drawer') toggleSlide(action);
    if (action === 'crank' || action === 'turn') turnHandle();
  }

  function finishMotions() {
    for (const slide of Object.values(slides)) {
      slide.value = slide.target;
      slide.active = false;
      slide.apply(slide.value);
    }
    finishTurn();
    requestRender();
  }
  function updateEnamel(color) {
    model.setEnamel(color);
    canvas.setAttribute('aria-label', `Interactive 3D ${color} Carl Angel-5 pencil sharpener`);
    requestRender();
  }
  function resize() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.left = -1.95 * width / height;
    camera.right = 1.95 * width / height;
    camera.top = 1.95;
    camera.bottom = -1.95;
    camera.updateProjectionMatrix();
    requestRender();
  }

  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.isPrimary === false || drag) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw, pitch,
      threshold: event.pointerType === 'touch' ? 8 : 6, moved: false, action: pickAction(event) };
    if (event.pointerType === 'mouse') canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag) { if (event.pointerType === 'mouse') updateHover(event); return; }
    if (drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > drag.threshold) drag.moved = true;
    if (!drag.moved) return;
    canvas.dataset.dragging = 'true';
    clearHover();
    yaw = drag.yaw - dx * 0.013;
    pitch = THREE.MathUtils.clamp(drag.pitch + dy * 0.01, -0.12, 0.75);
    requestRender();
  });
  function releasePointer() {
    drag = null;
    delete canvas.dataset.dragging;
  }
  canvas.addEventListener('pointerup', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const pressed = drag;
    const clicked = !pressed.moved && Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) <= pressed.threshold;
    releasePointer();
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (clicked && pressed.action && pickAction(event) === pressed.action) activate(pressed.action);
    if (event.pointerType === 'mouse') updateHover(event);
  });
  ['pointercancel', 'lostpointercapture'].forEach(type => canvas.addEventListener(type, releasePointer));
  canvas.addEventListener('pointerleave', () => { if (!drag) clearHover(); });
  canvas.addEventListener('keydown', event => {
    switch (event.key) {
      case 'ArrowLeft': yaw -= 0.18; break;
      case 'ArrowRight': yaw += 0.18; break;
      case 'ArrowUp': pitch = Math.min(pitch + 0.12, 0.75); break;
      case 'ArrowDown': pitch = Math.max(pitch - 0.12, -0.12); break;
      case 'Home': yaw = initial.yaw; pitch = initial.pitch; break;
      case 'Enter': case ' ': turnHandle(); break;
      case 'h': case 'H': toggleSlide('clamp'); break;
      case 'b': case 'B': toggleSlide('drawer'); break;
      default: return;
    }
    event.preventDefault();
    requestRender();
  });
  controls.querySelectorAll('button[data-action]').forEach(button => {
    button.addEventListener('click', () => activate(button.dataset.action));
  });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) finishMotions(); });
  document.addEventListener('enamelchange', event => updateEnamel(event.detail.color));
  document.addEventListener('visibilitychange', requestRender);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    contextLost = true;
    releasePointer();
    clearHover();
    finishMotions();
    host.classList.remove('is-ready');
    controls.hidden = true;
    canvas.hidden = true;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    environment.dispose();
    environment = createEnvironment();
    scene.environment = environment.texture;
    contextLost = false;
    canvas.hidden = false;
    host.classList.add('is-ready');
    controls.hidden = false;
    requestRender();
  });
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) requestRender(); }).observe(host);
  updateEnamel(document.documentElement.dataset.enamel || 'red');
  resize();
  updateCamera();
  renderer.render(scene, camera);
  host.append(canvas);
  host.classList.add('is-ready');
  controls.hidden = false;
}
