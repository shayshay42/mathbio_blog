import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { aliveCount, GRID_SIZE, seedGrid, stepGrid } from '../projects/molecular-game-of-life/life.js';
import { EXAMPLES } from '../projects/molecular-game-of-life/examples.js';

const require = createRequire(import.meta.url);
globalThis.initRDKitModule = require('../assets/vendor/rdkit-2026.3.6/RDKit_minimal.js');
const { loadChemistry, moleculeFromSmiles, lookupName } = await import('../projects/molecular-game-of-life/chemistry.js');

const board = (size, cells) => {
  const grid = new Uint8Array(size * size);
  for (const [row, column] of cells) grid[row * size + column] = 1;
  return grid;
};
const evolve = (grid, size) => stepGrid(grid, new Uint8Array(grid.length), size);

test('Conway survival: a block stays fixed; a lone cell dies', () => {
  const block = board(6, [[2, 2], [2, 3], [3, 2], [3, 3]]);
  assert.deepEqual(evolve(block, 6), block);
  assert.equal(aliveCount(evolve(board(6, [[2, 2]]), 6)), 0);
});

test('synchronous generations: a blinker oscillates and the source is unchanged', () => {
  const horizontal = board(7, [[3, 2], [3, 3], [3, 4]]);
  const snapshot = horizontal.slice();
  const vertical = evolve(horizontal, 7);
  assert.deepEqual(vertical, board(7, [[2, 3], [3, 3], [4, 3]]));
  assert.deepEqual(evolve(vertical, 7), horizontal);
  assert.deepEqual(horizontal, snapshot);
});

test('a glider moves one row and column in four generations', () => {
  let grid = board(8, [[1, 2], [2, 3], [3, 1], [3, 2], [3, 3]]);
  for (let generation = 0; generation < 4; generation += 1) grid = evolve(grid, 8);
  assert.deepEqual(grid, board(8, [[2, 3], [3, 4], [4, 2], [4, 3], [4, 4]]));
});

test('neighbors wrap across both grid edges and the corner', () => {
  const edgeBlinker = board(7, [[0, 6], [0, 0], [0, 1]]);
  assert.deepEqual(evolve(edgeBlinker, 7), board(7, [[6, 0], [0, 0], [1, 0]]));
  const cornerBlock = board(7, [[6, 6], [6, 0], [0, 6], [0, 0]]);
  assert.deepEqual(evolve(cornerBlock, 7), cornerBlock);
});

test('adjacency is symmetric, binary, and uses the original odd/even centering', () => {
  const odd = seedGrid(3, [[0, 1], [1, 2], [0, 1]]);
  assert.equal(odd.length, GRID_SIZE ** 2);
  assert.equal(aliveCount(odd), 4);
  assert.equal(odd[49 * 100 + 50], 1);
  assert.equal(odd[50 * 100 + 49], 1);
  assert.equal(odd[50 * 100 + 51], 1);
  const even = seedGrid(4, [[0, 3]]);
  assert.equal(even[48 * 100 + 51], 1);
  const full = seedGrid(100, [[0, 99]]);
  assert.equal(full[99], 1);
  assert.equal(full[9900], 1);
  assert.throws(() => seedGrid(101, []), /1–100/);
  assert.throws(() => seedGrid(3, [[0, 3]]), /invalid bond/);
  assert.throws(() => stepGrid(odd, odd), /separate/);
});

test('bundled molecules have the expected atoms, hydrogens, and bonds', async () => {
  assert.equal((await loadChemistry()).version(), '2026.03.6');
  const expected = { pemoline: [21, 22], ethanol: [9, 8], benzene: [12, 12], caffeine: [24, 25], glucose: [24, 24] };
  for (const example of EXAMPLES) {
    const result = await moleculeFromSmiles(example.smiles);
    assert.deepEqual([result.atomCount, result.bondCount], expected[example.id], example.name);
    assert.equal(aliveCount(result.grid), result.bondCount * 2);
  }
});

test('SMILES atom order is retained, including explicitly written hydrogens', async () => {
  const forward = await moleculeFromSmiles('CCO');
  const reverse = await moleculeFromSmiles('OCC');
  assert.notDeepEqual(forward.grid, reverse.grid);
  // CCO heavy atoms are 0,1,2; the three hydrogens on atom 0 are 3,4,5.
  const offset = 46;
  for (const hydrogen of [3, 4, 5]) assert.equal(forward.grid[offset * 100 + offset + hydrogen], 1);
  assert.equal(reverse.grid[offset * 100 + offset + 4], 0);
  const explicit = await moleculeFromSmiles('[H]OC');
  assert.equal(explicit.atomCount, 6);
  assert.equal(explicit.grid[47 * 100 + 48], 1);
  assert.equal(explicit.grid[48 * 100 + 49], 1);
});

test('bond order does not weight the grid; unbonded atoms are valid', async () => {
  const alkene = await moleculeFromSmiles('C=C');
  assert.equal(alkene.atomCount, 6);
  assert.equal(alkene.bondCount, 5);
  assert.equal(aliveCount(alkene.grid), 10);
  const helium = await moleculeFromSmiles('[He]');
  assert.equal(helium.atomCount, 1);
  assert.equal(aliveCount(helium.grid), 0);
});

test('invalid SMILES and molecules exceeding 100 atoms with hydrogens are rejected', async () => {
  await assert.rejects(moleculeFromSmiles(''), /Enter a SMILES/);
  await assert.rejects(moleculeFromSmiles('CCO example'), /without spaces/);
  await assert.rejects(moleculeFromSmiles('C1'), /could not be read/);
  await assert.rejects(moleculeFromSmiles('C'.repeat(34)), /104 atoms.*at most 100/);
});

test('name lookup encodes the query, supports the current PubChem response, and caches success', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    calls += 1;
    assert.match(url, /name\/ethanol%20test\/property\/SMILES\/JSON$/);
    return new Response(JSON.stringify({ PropertyTable: { Properties: [{ CID: 702, SMILES: 'CCO' }] } }));
  });
  assert.deepEqual(await lookupName('ethanol test'), { cid: 702, smiles: 'CCO' });
  assert.deepEqual(await lookupName('  ETHANOL TEST  '), { cid: 702, smiles: 'CCO' });
  assert.equal(calls, 1);
});

test('name lookup reports unknown names, unavailable PubChem, and malformed results', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 404 }));
  await assert.rejects(lookupName('unknown test molecule'), /could not find/);
  fetchMock.mock.mockImplementation(async () => new Response('', { status: 503 }));
  await assert.rejects(lookupName('busy test molecule'), /PubChem is busy/);
  fetchMock.mock.mockImplementation(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(lookupName('offline test molecule'), /PubChem is unavailable/);
  fetchMock.mock.mockImplementation(async () => new Response('{}'));
  await assert.rejects(lookupName('malformed test molecule'), /no SMILES/);
  fetchMock.mock.mockImplementation(async () => new Response('<html>temporarily unavailable</html>'));
  await assert.rejects(lookupName('non-json test molecule'), /unreadable response/);
});

test('name lookup cancels an in-flight request and never caches it', async t => {
  const controller = new AbortController();
  let started;
  const requestStarted = new Promise(resolve => { started = resolve; });
  const fetchMock = t.mock.method(globalThis, 'fetch', async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    started();
  }));
  const pending = lookupName('cancelled test molecule', { signal: controller.signal });
  await requestStarted;
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  fetchMock.mock.mockImplementation(async () => new Response(JSON.stringify({ PropertyTable: { Properties: [{ CID: 702, SMILES: 'CCO' }] } })));
  assert.deepEqual(await lookupName('cancelled test molecule'), { cid: 702, smiles: 'CCO' });
  assert.equal(fetchMock.mock.callCount(), 2);
  await assert.rejects(lookupName('cancelled test molecule', { signal: controller.signal }), { name: 'AbortError' });
});

test('rapid searches stay below PubChem’s request limit and a queued search can be cancelled', async t => {
  const started = [];
  t.mock.method(globalThis, 'fetch', async () => {
    started.push(Date.now());
    return new Response(JSON.stringify({ PropertyTable: { Properties: [{ CID: 702, SMILES: 'CCO' }] } }));
  });
  const first = lookupName('paced molecule one');
  const controller = new AbortController();
  const cancelled = lookupName('paced molecule cancelled', { signal: controller.signal });
  const second = lookupName('paced molecule two');
  controller.abort();
  await assert.rejects(cancelled, { name: 'AbortError' });
  await Promise.all([first, second]);
  assert.equal(started.length, 2);
  assert.ok(started[1] - started[0] >= 250);
});

test('chemistry initialization can be retried after a runtime failure', async t => {
  const realInit = globalThis.initRDKitModule;
  let attempts = 0;
  t.mock.method(globalThis, 'initRDKitModule', async options => {
    attempts += 1;
    if (attempts === 1) throw new Error('Temporary WASM download failure');
    return realInit(options);
  });
  const fresh = await import('../projects/molecular-game-of-life/chemistry.js?retry-test');
  await assert.rejects(fresh.loadChemistry(), /chemistry engine could not load/);
  assert.equal((await fresh.moleculeFromSmiles('CCO')).atomCount, 9);
  assert.equal(attempts, 2);
});

test('a stalled chemistry initialization times out and allows retry', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let started;
  const initializationStarted = new Promise(resolve => { started = resolve; });
  const initMock = t.mock.method(globalThis, 'initRDKitModule', () => {
    started();
    return new Promise(() => {});
  });
  const fresh = await import('../projects/molecular-game-of-life/chemistry.js?timeout-test');
  const failed = assert.rejects(fresh.loadChemistry(), /chemistry engine could not load/);
  await initializationStarted;
  t.mock.timers.tick(30001);
  await failed;
  initMock.mock.mockImplementation(() => loadChemistry());
  assert.equal((await fresh.moleculeFromSmiles('CCO')).atomCount, 9);
});
