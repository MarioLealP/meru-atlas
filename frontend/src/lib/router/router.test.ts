import { describe, expect, it } from "vitest";
import { corners, routeAll } from "./route";
import type { Pt, Rect, Routed } from "./types";

const box = (id: string, x: number, y: number, w = 100, h = 60): Rect => ({ id, x, y, w, h });

function segments(r: Routed): [Pt, Pt][] {
  return r.points.slice(1).map((p, i) => [r.points[i]!, p]);
}
function orthogonal(r: Routed): boolean {
  return segments(r).every(([a, b]) => a.x === b.x || a.y === b.y);
}
/** Does a segment pass through the INSIDE of a box (touching the border at a port is fine)? */
function hitsBox([a, b]: [Pt, Pt], r: Rect): boolean {
  const [x1, x2] = [Math.min(a.x, b.x), Math.max(a.x, b.x)];
  const [y1, y2] = [Math.min(a.y, b.y), Math.max(a.y, b.y)];
  return x2 > r.x && x1 < r.x + r.w && y2 > r.y && y1 < r.y + r.h;
}
/** Collinear overlap length between two axis-aligned segments. */
function overlap([a, b]: [Pt, Pt], [c, d]: [Pt, Pt]): number {
  if (a.y === b.y && c.y === d.y && a.y === c.y)
    return Math.max(
      0,
      Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) - Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)),
    );
  if (a.x === b.x && c.x === d.x && a.x === c.x)
    return Math.max(
      0,
      Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) - Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)),
    );
  return 0;
}

describe("corners", () => {
  it("keeps only turning points", () => {
    const p = corners([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
      { x: 20, y: 20 },
    ]);
    expect(p).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
    ]);
  });
});

describe("routeAll", () => {
  it("connects facing sides with orthogonal segments", () => {
    const [r] = routeAll([box("a", 0, 0), box("b", 300, 0)], [{ id: "e", from: "a", to: "b" }]);
    expect(r!.ok).toBe(true);
    expect(orthogonal(r!)).toBe(true);
    expect(r!.points[0]!.x).toBe(100); // right side of a
    expect(r!.points.at(-1)!.x).toBe(300); // left side of b
  });

  it("goes around an obstacle instead of through it", () => {
    const rects = [box("a", 0, 100), box("wall", 200, 40, 80, 200), box("b", 400, 100)];
    const [r] = routeAll(rects, [{ id: "e", from: "a", to: "b" }]);
    expect(r!.ok).toBe(true);
    for (const s of segments(r!)) expect(hitsBox(s, rects[1]!)).toBe(false);
  });

  it("never lets parallel lines overlap", () => {
    const rects = [box("a", 0, 0), box("b", 0, 200), box("c", 500, 0), box("d", 500, 200)];
    const out = routeAll(rects, [
      { id: "1", from: "a", to: "c" },
      { id: "2", from: "a", to: "d" },
      { id: "3", from: "b", to: "c" },
      { id: "4", from: "b", to: "d" },
    ]);
    const segs = out.map(segments);
    for (let i = 0; i < segs.length; i++)
      for (let j = i + 1; j < segs.length; j++)
        for (const s of segs[i]!) for (const t of segs[j]!) expect(overlap(s, t)).toBe(0);
  });

  it("is deterministic", () => {
    const rects = [box("a", 0, 0), box("b", 300, 120), box("c", 600, 0)];
    const edges = [
      { id: "1", from: "a", to: "b" },
      { id: "2", from: "b", to: "c" },
      { id: "3", from: "a", to: "c" },
    ];
    expect(JSON.stringify(routeAll(rects, edges))).toBe(JSON.stringify(routeAll(rects, edges)));
  });

  it("skips edges to unknown boxes and self-loops", () => {
    const out = routeAll(
      [box("a", 0, 0)],
      [
        { id: "x", from: "a", to: "zz" },
        { id: "y", from: "a", to: "a" },
      ],
    );
    expect(out).toEqual([]);
  });

  it("routes a dense column map without crossing any box", () => {
    // 7 columns x 9 rows like the atlas, 60 edges between random pairs
    const rects: Rect[] = [];
    for (let c = 0; c < 7; c++)
      for (let r = 0; r < 9; r++) rects.push(box(`n${c}-${r}`, c * 360, r * 120, 250, 80));
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const edges = Array.from({ length: 60 }, (_, i) => {
      const a = rects[Math.floor(rnd() * rects.length)]!.id,
        b = rects[Math.floor(rnd() * rects.length)]!.id;
      return { id: `e${i}`, from: a, to: b };
    });
    const t0 = performance.now();
    const out = routeAll(rects, edges);
    const ms = performance.now() - t0;
    const okRate = out.filter((r) => r.ok).length / out.length;
    expect(okRate).toBe(1);
    for (const r of out)
      for (const s of segments(r))
        for (const b of rects)
          if (
            b.id !== edges.find((e) => e.id === r.id)!.from &&
            b.id !== edges.find((e) => e.id === r.id)!.to
          )
            expect(hitsBox(s, b)).toBe(false);
    expect(ms).toBeLessThan(5000);
    console.log(`dense map: ${out.length} edges in ${ms.toFixed(0)} ms`);
  });
});
