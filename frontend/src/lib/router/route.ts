import { search } from "./astar";
import { Grid } from "./grid";
import { assignPorts, type Port } from "./ports";
import { DEFAULTS, type EdgeReq, type Pt, type Rect, type Routed, type RouterOptions } from "./types";

const NORMAL: Record<Port["side"], [number, number]> = {
  left: [-1, 0],
  right: [1, 0],
  top: [0, -1],
  bottom: [0, 1],
};
const DIR: Record<Port["side"], number> = { right: 0, left: 1, bottom: 2, top: 3 }; // matches astar DX/DY

/** Route every edge orthogonally around the boxes. Deterministic for the same input. */
export function routeAll(rects: Rect[], edges: EdgeReq[], opts: Partial<RouterOptions> = {}): Routed[] {
  const o = { ...DEFAULTS, ...opts };
  const boxes = new Map(rects.map((r) => [r.id, r]));
  const valid = edges.filter((e) => boxes.has(e.from) && boxes.has(e.to) && e.from !== e.to);
  const pad = o.cell * (o.margin + 6);
  const x1 = Math.min(...rects.map((r) => r.x)) - pad,
    y1 = Math.min(...rects.map((r) => r.y)) - pad;
  const x2 = Math.max(...rects.map((r) => r.x + r.w)) + pad,
    y2 = Math.max(...rects.map((r) => r.y + r.h)) + pad;
  const g = new Grid({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 }, o.cell);
  rects.forEach((r) => g.block(r, o.margin));
  const ports = assignPorts(boxes, valid, o.cell);

  // short edges first: they have the fewest options, long ones can detour around them
  const order = [...valid].sort((a, b) => dist(boxes, a) - dist(boxes, b) || (a.id < b.id ? -1 : 1));
  // Reserve every port corridor before routing anything, so early lines keep clear of the
  // doors later lines must use (otherwise two lines can be forced to share a lane).
  const stubs = new Map<string, [Stub, Stub]>();
  for (const e of valid) {
    const [pa, pb] = ports.get(e.id)!;
    const pair: [Stub, Stub] = [stub(g, pa, o.margin + 1), stub(g, pb, o.margin + 1)];
    pair.forEach((st) => mark(g, st.cells));
    stubs.set(e.id, pair);
  }
  const out = new Map<string, Routed>();
  for (const e of order) {
    const [pa, pb] = ports.get(e.id)!;
    const [sa, sb] = stubs.get(e.id)!;
    unmark(g, sa.cells);
    unmark(g, sb.cells);
    const path = search(g, sa.end, DIR[pa.side], sb.end, o);
    if (!path) {
      out.set(e.id, { id: e.id, points: [pa.pt, pb.pt], ok: false });
      continue;
    }
    mark(g, [...sa.cells, ...path.slice(1), ...sb.cells.slice(0, -1).reverse()]);
    const pts = path.map((i) => g.toPt(i % g.cols, (i / g.cols) | 0));
    out.set(e.id, { id: e.id, points: corners([pa.pt, ...pts, pb.pt]), ok: true });
  }
  return valid.map((e) => out.get(e.id)!);
}

function dist(boxes: Map<string, Rect>, e: EdgeReq): number {
  const a = boxes.get(e.from)!,
    b = boxes.get(e.to)!;
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

type Stub = { cells: number[]; end: [number, number] };

/**
 * A short straight corridor from the port out through the box margin. Only its outer end
 * is opened for the search; the inner cells stay blocked, so no other line can slip in.
 */
function stub(g: Grid, p: Port, len: number): Stub {
  const [c0, r0] = g.toCell(p.pt),
    [dx, dy] = NORMAL[p.side];
  const cells: number[] = [];
  for (let k = 1; k <= len; k++) {
    const c = c0 + dx * k,
      r = r0 + dy * k;
    if (!g.inside(c, r)) break;
    cells.push(g.idx(c, r));
  }
  const last = cells[cells.length - 1] ?? g.idx(c0, r0);
  g.free(last % g.cols, (last / g.cols) | 0);
  return { cells, end: [last % g.cols, (last / g.cols) | 0] };
}

function unmark(g: Grid, cells: number[]): void {
  for (let k = 1; k < cells.length; k++) {
    const a = cells[k - 1]!,
      b = cells[k]!;
    const axis = Math.abs(a - b) === 1 ? 0 : 1;
    g.usage[axis]![a] = Math.max(0, g.usage[axis]![a]! - 1);
    g.usage[axis]![b] = Math.max(0, g.usage[axis]![b]! - 1);
  }
}

function mark(g: Grid, cells: number[]): void {
  for (let k = 1; k < cells.length; k++) {
    const a = cells[k - 1]!,
      b = cells[k]!;
    if (a === b) continue;
    const axis = Math.abs(a - b) === 1 ? 0 : 1;
    g.usage[axis]![a]!++;
    g.usage[axis]![b]!++;
  }
}

/** Drop collinear interior points: keep only start, corners and end. */
export function corners(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) {
    const n = out.length;
    if (n && out[n - 1]!.x === p.x && out[n - 1]!.y === p.y) continue;
    if (n >= 2) {
      const a = out[n - 2]!,
        b = out[n - 1]!;
      if ((a.x === b.x && b.x === p.x) || (a.y === b.y && b.y === p.y)) out[n - 1] = p;
      else out.push(p);
    } else out.push(p);
  }
  return out;
}
