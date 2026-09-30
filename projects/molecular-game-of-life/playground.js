import { GRID_SIZE, stepGrid, aliveCount } from './life.js';
import { loadChemistry, moleculeFromSmiles, lookupName } from './chemistry.js';
import { EXAMPLES } from './examples.js';

const $ = id => document.getElementById(id);
const canvas = $('life-canvas');
const context = canvas.getContext('2d');
const query = $('molecule-query');
const mode = $('input-mode');
const status = $('load-status');
let grid = new Uint8Array(GRID_SIZE * GRID_SIZE);
let next = new Uint8Array(grid.length);
let initial = null;
let generation = 0;
let running = false;
let frame = 0;
let lastTime = 0;
let accumulator = 0;
let requestId = 0;
let lookupController = null;
let moleculeName = '';

function setStatus(message, error = false) {
  status.textContent = message;
  status.dataset.error = String(error);
}

function draw() {
  if (!context) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const pixels = Math.max(GRID_SIZE, Math.round(canvas.clientWidth * ratio));
  if (canvas.width !== pixels || canvas.height !== pixels) {
    canvas.width = pixels;
    canvas.height = pixels;
  }
  context.fillStyle = '#fafaf6';
  context.fillRect(0, 0, pixels, pixels);
  const cell = pixels / GRID_SIZE;
  context.strokeStyle = '#e9ece4';
  context.lineWidth = 1;
  context.beginPath();
  for (let i = 10; i < GRID_SIZE; i += 10) {
    const p = Math.round(i * cell) + 0.5;
    context.moveTo(p, 0); context.lineTo(p, pixels);
    context.moveTo(0, p); context.lineTo(pixels, p);
  }
  context.stroke();
  context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  const inset = cell >= 5 ? 0.4 * ratio : 0;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i]) context.fillRect((i % GRID_SIZE) * cell + inset, Math.floor(i / GRID_SIZE) * cell + inset, cell - inset * 2, cell - inset * 2);
  }
  const population = aliveCount(grid);
  $('generation').textContent = generation;
  $('population').textContent = population;
  canvas.setAttribute('aria-label', `${moleculeName || 'Molecular'} Game of Life. Generation ${generation}, ${population} live cells on a 100 by 100 grid.`);
}

function pause(message = 'Paused') {
  running = false;
  cancelAnimationFrame(frame);
  frame = 0;
  lastTime = 0;
  accumulator = 0;
  $('play-pause').textContent = 'Play';
  $('step').disabled = !initial;
  $('simulation-status').textContent = message;
}

function advance() {
  stepGrid(grid, next);
  [grid, next] = [next, grid];
  generation += 1;
}

function animate(time) {
  if (!running) return;
  if (!lastTime) lastTime = time;
  accumulator += Math.min(time - lastTime, 250);
  lastTime = time;
  const interval = 1000 / Number($('speed').value);
  let changed = false;
  while (accumulator >= interval) {
    advance();
    accumulator -= interval;
    changed = true;
  }
  if (changed) draw();
  frame = requestAnimationFrame(animate);
}

function setExampleSelection(id) {
  document.querySelectorAll('[data-example]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.example === id));
  });
}

function cancelLookup() {
  requestId += 1;
  lookupController?.abort();
  lookupController = null;
  $('molecule-form').removeAttribute('aria-busy');
}

async function selectMolecule({ name, smiles, exampleId, searchName }) {
  cancelLookup();
  const id = requestId;
  const controller = new AbortController();
  lookupController = controller;
  const timeout = setTimeout(() => controller.abort(), 15000);
  $('molecule-form').setAttribute('aria-busy', 'true');
  setStatus(searchName ? `Looking up ${name}…` : `Reading ${name}…`);
  try {
    let cid = null;
    if (searchName) ({ smiles, cid } = await lookupName(name, { signal: controller.signal }));
    if (id !== requestId) return;
    const molecule = await moleculeFromSmiles(smiles);
    if (id !== requestId) return;
    pause();
    moleculeName = name;
    grid = molecule.grid.slice();
    next = new Uint8Array(grid.length);
    initial = grid.slice();
    generation = 0;
    $('play-pause').disabled = false;
    $('step').disabled = false;
    $('reset').disabled = false;
    $('molecule-description').textContent = `${name} · ${molecule.atomCount} atoms`;
    setStatus(`${molecule.bondCount} bonds · hydrogens included${cid ? ` · PubChem CID ${cid}` : ''}`);
    setExampleSelection(exampleId);
    draw();
  } catch (error) {
    if (id !== requestId) return;
    const message = error.name === 'AbortError'
      ? 'The search timed out. Try again, paste SMILES, or choose an example.'
      : error.message || 'The molecule could not be loaded. Try another name or SMILES.';
    setStatus(message, true);
  } finally {
    clearTimeout(timeout);
    if (id === requestId) {
      lookupController = null;
      $('molecule-form').removeAttribute('aria-busy');
    }
  }
}

function setInputMode() {
  const smiles = mode.value === 'smiles';
  $('query-label').textContent = smiles ? 'SMILES string' : 'Molecule name';
  query.placeholder = smiles ? 'e.g. CCO' : 'e.g. caffeine';
}

for (const example of EXAMPLES) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = example.name;
  button.dataset.example = example.id;
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => {
    mode.value = 'name';
    setInputMode();
    query.value = example.name;
    selectMolecule({ ...example, exampleId: example.id });
  });
  $('examples').append(button);
}

$('molecule-form').addEventListener('submit', event => {
  event.preventDefault();
  const value = query.value.trim();
  if (!value) { setStatus('Enter a molecule name or SMILES string.', true); return; }
  selectMolecule(mode.value === 'name'
    ? { name: value, searchName: true }
    : { name: 'Your molecule', smiles: value });
});

mode.addEventListener('change', () => {
  cancelLookup();
  query.value = '';
  setInputMode();
  setStatus(mode.value === 'smiles' ? 'Paste a SMILES string, then load the molecule.' : 'Enter a molecule name, then load it from PubChem.');
  query.focus();
});

$('play-pause').addEventListener('click', () => {
  if (running) { pause(); return; }
  if (!initial) return;
  running = true;
  $('play-pause').textContent = 'Pause';
  $('step').disabled = true;
  $('simulation-status').textContent = 'Playing';
  frame = requestAnimationFrame(animate);
});
$('step').addEventListener('click', () => { if (initial && !running) { advance(); draw(); } });
$('reset').addEventListener('click', () => {
  if (!initial) return;
  pause();
  grid = initial.slice();
  generation = 0;
  draw();
});
$('speed').addEventListener('input', () => {
  $('speed-value').textContent = $('speed').value;
  $('speed').setAttribute('aria-valuetext', `${$('speed').value} generations per second`);
  accumulator = 0;
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && running) pause('Paused while this tab was hidden.');
});
document.addEventListener('enamelchange', draw);
new ResizeObserver(draw).observe(canvas);

async function initialize() {
  $('retry-engine').hidden = true;
  setStatus('Loading the chemistry tools…');
  try {
    await loadChemistry();
    $('molecule-inputs').disabled = false;
    $('example-inputs').disabled = false;
    await selectMolecule({ ...EXAMPLES[0], exampleId: EXAMPLES[0].id });
  } catch {
    setStatus('The chemistry tools could not load. Check your connection and retry in a current browser.', true);
    $('retry-engine').hidden = false;
  }
}
$('retry-engine').addEventListener('click', initialize);
if (!context) {
  setStatus('This browser cannot draw the simulation. Please use a browser with canvas support.', true);
} else {
  draw();
  initialize();
}
