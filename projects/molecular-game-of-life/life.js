export const GRID_SIZE = 100;

/** Place a binary adjacency matrix at the original app's centered offset. */
export function seedGrid(atomCount, bonds) {
  if (!Number.isInteger(atomCount) || atomCount < 1 || atomCount > GRID_SIZE) {
    throw new RangeError(`Choose a molecule with 1–${GRID_SIZE} atoms, including hydrogens.`);
  }
  const grid = new Uint8Array(GRID_SIZE * GRID_SIZE);
  const offset = GRID_SIZE / 2 - Math.floor(atomCount / 2);
  for (const [a, b] of bonds) {
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a >= atomCount || b >= atomCount || a === b) {
      throw new RangeError('The molecule contains an invalid bond.');
    }
    grid[(offset + a) * GRID_SIZE + offset + b] = 1;
    grid[(offset + b) * GRID_SIZE + offset + a] = 1;
  }
  return grid;
}

/** Write one synchronous Conway B3/S23 generation, wrapping both edges. */
export function stepGrid(current, next, size = GRID_SIZE) {
  if (!Number.isInteger(size) || size < 3 || current.length !== size * size || next.length !== size * size || current === next) {
    throw new RangeError('Use separate square grids of the same size.');
  }
  for (let row = 0; row < size; row += 1) {
    const above = ((row + size - 1) % size) * size;
    const here = row * size;
    const below = ((row + 1) % size) * size;
    for (let column = 0; column < size; column += 1) {
      const left = (column + size - 1) % size;
      const right = (column + 1) % size;
      const neighbors = current[above + left] + current[above + column] + current[above + right]
        + current[here + left] + current[here + right]
        + current[below + left] + current[below + column] + current[below + right];
      next[here + column] = Number(neighbors === 3 || (neighbors === 2 && current[here + column] === 1));
    }
  }
  return next;
}

export function aliveCount(grid) {
  let count = 0;
  for (const cell of grid) count += cell;
  return count;
}
