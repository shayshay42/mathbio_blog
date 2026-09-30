// PubChem PUG REST property/SMILES responses, retrieved 2026-09-30.
// Fixed atom order makes these examples reproducible without a network lookup.
export const EXAMPLES = Object.freeze([
  { id: 'pemoline', name: 'Pemoline', smiles: 'C1=CC=C(C=C1)C2C(=O)N=C(O2)N', cid: 4723 },
  { id: 'ethanol', name: 'Ethanol', smiles: 'CCO', cid: 702 },
  { id: 'benzene', name: 'Benzene', smiles: 'C1=CC=CC=C1', cid: 241 },
  { id: 'caffeine', name: 'Caffeine', smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C', cid: 2519 },
  { id: 'glucose', name: 'Glucose', smiles: 'C([C@@H]1[C@H]([C@@H]([C@H](C(O1)O)O)O)O)O', cid: 5793 },
].map(Object.freeze));
