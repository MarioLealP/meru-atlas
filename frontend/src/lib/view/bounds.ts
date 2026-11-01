import type { Pt, Rect } from "../router";

/** Bounding box of the given unit boxes and line points, padded; null if empty. */
export function boundsOf(ids: Iterable<string>, boxes: Map<string, Rect>, lines: Pt[][] = [], pad = 40) {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const id of ids) {
    const b = boxes.get(id);
    if (!b) continue;
    x0 = Math.min(x0, b.x);
    y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.w);
    y1 = Math.max(y1, b.y + b.h);
  }
  for (const p of lines.flat()) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  return x0 === Infinity ? null : { x: x0 - pad, y: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad };
}
