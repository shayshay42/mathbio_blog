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
  canvas.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown Home Enter Space');

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

  function requestRender() {
    if (!frame && visible && !contextLost && !document.hidden) frame = requestAnimationFrame(render);
  }
  function render(time) {
    frame = 0;
    if (contextLost || !visible || document.hidden) return;
    camera.position.set(7 * Math.sin(yaw) * Math.cos(pitch), 7 * Math.sin(pitch), 7 * Math.cos(yaw) * Math.cos(pitch));
    camera.lookAt(0, 0.02, -0.15);
    if (turning) {
      const progress = Math.min((time - turning.start) / 1000, 1);
      const eased = progress * progress * (3 - 2 * progress);
      model.crank.rotation.z = turning.angle - Math.PI * 2 * eased;
      if (progress === 1) { model.crank.rotation.z %= Math.PI * 2; turning = null; }
    }
    renderer.render(scene, camera);
    if (turning) requestRender();
  }
  function turnHandle() {
    if (turning) return;
    if (reducedMotion.matches) {
      model.crank.rotation.z -= Math.PI / 3;
    } else {
      turning = { start: performance.now(), angle: model.crank.rotation.z };
    }
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
    if (event.button !== 0 || drag) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw, pitch };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    yaw = drag.yaw - (event.clientX - drag.x) * 0.013;
    pitch = THREE.MathUtils.clamp(drag.pitch + (event.clientY - drag.y) * 0.01, -0.12, 0.75);
    requestRender();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => canvas.addEventListener(type, () => { drag = null; }));
  canvas.addEventListener('keydown', event => {
    switch (event.key) {
      case 'ArrowLeft': yaw -= 0.18; break;
      case 'ArrowRight': yaw += 0.18; break;
      case 'ArrowUp': pitch = Math.min(pitch + 0.12, 0.75); break;
      case 'ArrowDown': pitch = Math.max(pitch - 0.12, -0.12); break;
      case 'Home': yaw = initial.yaw; pitch = initial.pitch; break;
      case 'Enter': case ' ': turnHandle(); break;
      default: return;
    }
    event.preventDefault();
    requestRender();
  });
  controls.querySelector('button').addEventListener('click', turnHandle);
  document.addEventListener('enamelchange', event => updateEnamel(event.detail.color));
  document.addEventListener('visibilitychange', requestRender);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    contextLost = true;
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
  camera.position.set(7 * Math.sin(yaw) * Math.cos(pitch), 7 * Math.sin(pitch), 7 * Math.cos(yaw) * Math.cos(pitch));
  camera.lookAt(0, 0.02, -0.15);
  renderer.render(scene, camera);
  host.append(canvas);
  host.classList.add('is-ready');
  controls.hidden = false;
}
