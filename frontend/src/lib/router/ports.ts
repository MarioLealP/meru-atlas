import type { EdgeReq, Pt, Rect, Side } from "./types";

export type Port = { pt: Pt; side: Side };

const cx = (r: Rect) => r.x + r.w / 2;
const cy = (r: Rect) => r.y + r.h / 2;

/** Which side of `a` faces `b`: horizontal unless the boxes overlap horizontally. */
export function facing(a: Rect, b: Rect): Side {
  const overlapX = a.x < b.x + b.w && b.x < a.x + a.w;
  if (!overlapX) return cx(b) > cx(a) ? "right" : "left";
  return cy(b) > cy(a) ? "bottom" : "top";
}

/**
 * Spread every line's attachment point along the box side it uses, ordered by where the
 * other end is, so lines leave a box without crossing each other at the door.
 * `step` keeps points on the routing grid.
 */
export function assignPorts(
  boxes: Map<string, Rect>,
  edges: EdgeReq[],
  step: number,
): Map<string, [Port, Port]> {
  type Slot = { edge: string; end: 0 | 1; other: Rect };
  const slots = new Map<string, Slot[]>(); // `${box}|${side}` -> slots
  const sides = new Map<string, [Side, Side]>();
  for (const e of edges) {
    const a = boxes.get(e.from)!,
      b = boxes.get(e.to)!;
    const sa = facing(a, b),
      sb = facing(b, a);
    sides.set(e.id, [sa, sb]);
    for (const [box, side, end, other] of [
      [e.from, sa, 0, b],
      [e.to, sb, 1, a],
    ] as const) {
      const k = `${box}|${side}`;
      if (!slots.has(k)) slots.set(k, []);
      slots.get(k)!.push({ edge: e.id, end, other });
    }
  }
  const out = new Map<string, [Port, Port]>();
  for (const [k, list] of slots) {
    const [boxId, side] = k.split("|") as [string, Side];
    const r = boxes.get(boxId)!;
    const vertical = side === "left" || side === "right";
    list.sort(
      (p, q) =>
        (vertical ? cy(p.other) - cy(q.other) : cx(p.other) - cx(q.other)) || (p.edge < q.edge ? -1 : 1),
    );
    const len = vertical ? r.h : r.w;
    const usable = Math.max(step, len - 2 * step);
    list.forEach((sl, i) => {
      const t = list.length === 1 ? len / 2 : step + (usable * (i + 0.5)) / list.length;
      const off = Math.round(t / step) * step;
      const pt: Pt =
        side === "left"
          ? { x: r.x, y: r.y + off }
          : side === "right"
            ? { x: r.x + r.w, y: r.y + off }
            : side === "top"
              ? { x: r.x + off, y: r.y }
              : { x: r.x + off, y: r.y + r.h };
      const pair = out.get(sl.edge) ?? ([undefined, undefined] as unknown as [Port, Port]);
      pair[sl.end] = { pt, side };
      out.set(sl.edge, pair);
    });
  }
  return out;
}
