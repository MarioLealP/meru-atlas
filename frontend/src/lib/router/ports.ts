import type { EdgeReq, Pt, Rect, Side } from "./types";

export type Port = { pt: Pt; side: Side };
type SlotT = { edge: string; end: 0 | 1; other: Rect };

const cx = (r: Rect) => r.x + r.w / 2;
const cy = (r: Rect) => r.y + r.h / 2;

/**
 * Which side of `a` a line to `b` uses.
 * - different columns: the side facing `b`;
 * - same column, directly stacked (gap smaller than a box): top/bottom, a straight drop;
 * - same column, further apart: the RIGHT side for both ends, so the line runs down the
 *   channel between columns instead of threading between the stacked boxes (that made
 *   comb- and box-shaped detours, Mario 2026-10-02 "weird squares").
 */
export function facing(a: Rect, b: Rect): Side {
  const overlapX = a.x < b.x + b.w && b.x < a.x + a.w;
  if (!overlapX) return cx(b) > cx(a) ? "right" : "left";
  const gap = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  if (gap > Math.min(a.h, b.h)) return "right";
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
  const slots = new Map<string, SlotT[]>(); // `${box}|${side}` -> slots
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
  spill(boxes, slots, step);
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

/** How many distinct grid doors fit on a side (corners excluded). */
export function capacity(r: Rect, side: Side, step: number): number {
  const len = side === "left" || side === "right" ? r.h : r.w;
  return Math.max(1, Math.floor((len - 2 * step) / step) + 1);
}

const PERP: Record<Side, [Side, Side]> = {
  left: ["top", "bottom"],
  right: ["top", "bottom"],
  top: ["left", "right"],
  bottom: ["left", "right"],
};

/**
 * A side with more lines than doors pushes the extras onto its two neighbouring sides:
 * the ones whose far end is earlier along the side (higher / further left) to the first,
 * the rest to the second. Without this, extra doors were rounded onto occupied ones and
 * lines overlapped (Mario 2026-10-02).
 */
function spill(boxes: Map<string, Rect>, slots: Map<string, SlotT[]>, step: number): void {
  for (let pass = 0; pass < 2; pass++) {
    for (const [k, list] of [...slots]) {
      const [boxId, side] = k.split("|") as [string, Side];
      const r = boxes.get(boxId)!;
      const cap = capacity(r, side, step);
      if (list.length <= cap) continue;
      const vertical = side === "left" || side === "right";
      list.sort((p, q) => (vertical ? cy(p.other) - cy(q.other) : cx(p.other) - cx(q.other)) || (p.edge < q.edge ? -1 : 1));
      const extra = list.length - cap;
      const first = list.splice(0, Math.ceil(extra / 2));
      const last = list.splice(list.length - Math.floor(extra / 2));
      const [s1, s2] = PERP[side];
      for (const [to, moved] of [
        [s1, first],
        [s2, last],
      ] as const) {
        const key = `${boxId}|${to}`;
        if (!slots.has(key)) slots.set(key, []);
        slots.get(key)!.push(...moved);
      }
    }
  }
}
