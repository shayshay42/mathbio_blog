import { GRID_SIZE, seedGrid } from './life.js';

const runtimeBase = new URL('../../assets/vendor/rdkit-2026.3.6/', import.meta.url);
const nameCache = new Map();
let scriptPromise;
let chemistryPromise;
let lastLookupStarted = 0;

function loadRuntimeScript() {
  if (typeof globalThis.initRDKitModule === 'function') return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const fail = () => {
        clearTimeout(timeout);
        script.remove();
        reject(new Error('The chemistry files could not load. Check your connection and try again.'));
      };
      const timeout = setTimeout(fail, 30000);
      script.src = new URL('RDKit_minimal.js', runtimeBase).href;
      script.async = true;
      script.onload = () => {
        clearTimeout(timeout);
        if (typeof globalThis.initRDKitModule === 'function') resolve();
        else fail();
      };
      script.onerror = fail;
      document.head.append(script);
    }).catch(error => {
      scriptPromise = undefined;
      throw error;
    });
  }
  return scriptPromise;
}

function initializeRuntime() {
  const controller = new AbortController();
  let timeout;
  return new Promise((resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error('The chemistry download took too long.'));
    }, 30000);
    const options = { locateFile: filename => new URL(filename, runtimeBase).href };
    if (runtimeBase.protocol === 'https:' || runtimeBase.protocol === 'http:') {
      // Own the browser fetch so a stalled WASM download can be cancelled and
      // retried. RDKit's default loader does not accept an AbortSignal.
      options.instantiateWasm = (imports, receiveInstance) => {
        fetch(new URL('RDKit_minimal.wasm', runtimeBase), { signal: controller.signal })
          .then(response => {
            if (!response.ok) throw new Error(`Chemistry download failed (${response.status}).`);
            return response.arrayBuffer();
          })
          .then(binary => WebAssembly.instantiate(binary, imports))
          .then(({ instance }) => receiveInstance(instance))
          .catch(reject);
        return {};
      };
    }
    Promise.resolve(globalThis.initRDKitModule(options)).then(resolve, reject);
  }).finally(() => {
    clearTimeout(timeout);
    controller.abort();
  });
}

/** Load the local WASM runtime on demand; a failed load can be retried. */
export function loadChemistry() {
  if (!chemistryPromise) {
    chemistryPromise = (async () => {
      if (typeof WebAssembly !== 'object') {
        throw new Error('This browser cannot run the chemistry engine. Try a current browser with WebAssembly support.');
      }
      await loadRuntimeScript();
      const chemistry = await initializeRuntime();
      chemistry.disable_logging('rdApp.error');
      chemistry.disable_logging('rdApp.warning');
      return chemistry;
    })().catch(error => {
      chemistryPromise = undefined;
      throw new Error('The chemistry engine could not load. Check your connection or try a current browser, then load a molecule again.', { cause: error });
    });
  }
  return chemistryPromise;
}

async function waitForLookupSlot(signal) {
  // PubChem permits at most five requests per second. Keep a little margin,
  // including when rapid submissions cancel a request that already started.
  while (true) {
    signal.throwIfAborted();
    const remaining = 250 - (Date.now() - lastLookupStarted);
    if (remaining <= 0) {
      lastLookupStarted = Date.now();
      return;
    }
    await new Promise((resolve, reject) => {
      const cancel = () => {
        clearTimeout(timer);
        reject(signal.reason);
      };
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', cancel);
        resolve();
      }, remaining);
      signal.addEventListener('abort', cancel, { once: true });
    });
  }
}

/** Parse without canonicalizing or reordering atoms; count every hydrogen. */
export async function moleculeFromSmiles(input) {
  const smiles = typeof input === 'string' ? input.trim() : '';
  if (!smiles) throw new Error('Enter a SMILES string.');
  if (smiles.length > 10000 || /\s/.test(smiles)) {
    throw new Error('Enter one SMILES string without spaces or line breaks.');
  }
  const chemistry = await loadChemistry();
  let molecule;
  try {
    // Preserve explicitly supplied hydrogens as well as the heavy-atom order.
    molecule = chemistry.get_mol(smiles, JSON.stringify({ removeHs: false }));
    if (!molecule) throw new Error('This SMILES string could not be read. Check its atoms, brackets, and ring numbers.');
    if (!molecule.add_hs_in_place()) throw new Error('Hydrogens could not be added to this molecule.');
    const graph = JSON.parse(molecule.get_json()).molecules[0];
    const atomCount = graph.atoms.length;
    if (atomCount > GRID_SIZE) {
      throw new Error(`This molecule has ${atomCount} atoms including hydrogens. The grid accepts at most ${GRID_SIZE}.`);
    }
    if (atomCount === 0) throw new Error('This SMILES string contains no atoms.');
    const bonds = graph.bonds.map(bond => bond.atoms);
    return { smiles, atomCount, bondCount: bonds.length, grid: seedGrid(atomCount, bonds) };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('This SMILES string could not be read. Check its atoms, brackets, and ring numbers.');
  } finally {
    molecule?.delete();
  }
}

/** Resolve a submitted name through PubChem, with cancellation and a tab-local cache. */
export async function lookupName(input, { signal } = {}) {
  const name = typeof input === 'string' ? input.trim() : '';
  if (!name) throw new Error('Enter a molecule name.');
  if (name.length > 200) throw new Error('Use a molecule name of 200 characters or fewer.');
  signal?.throwIfAborted();
  const cacheKey = name.toLocaleLowerCase('en');
  if (nameCache.has(cacheKey)) return { ...nameCache.get(cacheKey) };
  const controller = new AbortController();
  const cancel = () => controller.abort(signal.reason);
  signal?.addEventListener('abort', cancel, { once: true });
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 15000);
  try {
    await waitForLookupSlot(controller.signal);
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/property/SMILES/JSON`;
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (response.status === 404) throw new Error(`PubChem could not find “${name}”. Try another name, paste SMILES, or choose an example.`);
    if (response.status === 429 || response.status === 503) {
      throw new Error('PubChem is busy. Try again shortly, paste SMILES, or choose an example.');
    }
    if (!response.ok) throw new Error('PubChem could not complete this search. Try another name, paste SMILES, or choose an example.');
    const data = await response.json();
    const compound = data.PropertyTable?.Properties?.[0];
    const smiles = compound?.SMILES ?? compound?.IsomericSMILES;
    if (typeof smiles !== 'string' || !smiles) throw new Error('PubChem returned no SMILES for this name. Try another name or choose an example.');
    signal?.throwIfAborted();
    const result = { smiles, cid: compound.CID };
    nameCache.set(cacheKey, result);
    return { ...result };
  } catch (error) {
    if (signal?.aborted) throw signal.reason;
    if (timedOut) throw new Error('PubChem took too long to respond. Try again, paste SMILES, or choose an example.');
    if (error instanceof TypeError) throw new Error('PubChem is unavailable. Check your connection, paste SMILES, or choose an example.');
    if (error instanceof SyntaxError) throw new Error('PubChem returned an unreadable response. Try again or choose an example.');
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
  }
}
