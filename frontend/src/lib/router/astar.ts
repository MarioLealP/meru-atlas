import type { Grid } from "./grid";
import { MinHeap } from "./heap";
import type { RouterOptions } from "./types";

const DX = [1, -1, 0, 0];
const DY = [0, 0, 1, -1];
const AXIS = [0, 0, 1, 1]; // direction -> axis (0 horizontal, 1 vertical)

/**
 * Orthogonal A* from `start` to `goal` (cells: the outer ends of the two port corridors).
 * `startDir` is the direction the corridor points out of the box, so the first step can't
 * U-turn back into it. Arrival direction is free: the corridor already makes the last
 * segment perpendicular to the box. State = cell * 4 + direction of the last step.
 */
export function search(
  g: Grid,
  start: [number, number],
  startDir: number,
  goal: [number, number],
  o: RouterOptions,
): number[] | null {
  const N = g.cols * g.rows * 4;
  const cost = new Float64Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const heap = new MinHeap();
  const [gc, gr] = goal;
  const h = (c: number, r: number) => Math.abs(c - gc) + Math.abs(r - gr);
  const s = g.idx(start[0], start[1]);
  cost[s * 4 + startDir] = 0;
  heap.push(h(start[0], start[1]), s * 4 + startDir);
  const goalIdx = g.idx(gc, gr);
  let expansions = 0;
  while (heap.size) {
    const st = heap.pop()!;
    const cell = st >> 2,
      dir = st & 3;
    if (cell === goalIdx) return unwind(prev, st);
    if (++expansions > o.maxExpansions) return null;
    const c = cell % g.cols,
      r = (cell / g.cols) | 0;
    const base = cost[st]!;
    for (let nd = 0; nd < 4; nd++) {
      if ((nd ^ 1) === dir) continue; // no U-turn
      const nc = c + DX[nd]!,
        nr = r + DY[nd]!;
      if (!g.inside(nc, nr)) continue;
      const ni = g.idx(nc, nr);
      if (g.blocked[ni] && ni !== goalIdx) continue;
      const ax = AXIS[nd]!;
      let step = 1 + g.usage[ax]![ni]! * o.shareCost + (g.usage[1 - ax]![ni]! ? o.crossCost : 0);
      if (AXIS[dir] !== ax) step += o.bendCost;
      const ns = ni * 4 + nd,
        nc2 = base + step;
      if (nc2 < cost[ns]!) {
        cost[ns] = nc2;
        prev[ns] = st;
        heap.push(nc2 + h(nc, nr), ns);
      }
    }
  }
  return null;
}

function unwind(prev: Int32Array, st: number): number[] {
  const out: number[] = [];
  for (let s = st; s !== -1; s = prev[s]!) out.push(s >> 2);
  return out.reverse();
}
