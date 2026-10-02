import type { Pt, Rect } from "./types";

// Directions: 0 = horizontal, 1 = vertical (usage is tracked per axis).
export class Grid {
  readonly cols: number;
  readonly rows: number;
  readonly ox: number;
  readonly oy: number;
  readonly blocked: Uint8Array;
  readonly usage: [Uint16Array, Uint16Array]; // lines already through a cell, per axis

  constructor(
    bounds: { x: number; y: number; w: number; h: number },
    readonly cell: number,
  ) {
    this.ox = bounds.x;
    this.oy = bounds.y;
    this.cols = Math.ceil(bounds.w / cell) + 1;
    this.rows = Math.ceil(bounds.h / cell) + 1;
    const n = this.cols * this.rows;
    this.blocked = new Uint8Array(n);
    this.usage = [new Uint16Array(n), new Uint16Array(n)];
  }
  idx(c: number, r: number): number {
    return r * this.cols + c;
  }
  inside(c: number, r: number): boolean {
    return c >= 0 && r >= 0 && c < this.cols && r < this.rows;
  }
  toCell(p: Pt): [number, number] {
    return [Math.round((p.x - this.ox) / this.cell), Math.round((p.y - this.oy) / this.cell)];
  }
  toPt(c: number, r: number): Pt {
    return { x: this.ox + c * this.cell, y: this.oy + r * this.cell };
  }
  /** Mark a box (plus `margin` cells) as an obstacle. */
  block(rect: Rect, margin: number): void {
    const [c1, r1] = this.toCell({ x: rect.x, y: rect.y });
    const [c2, r2] = this.toCell({ x: rect.x + rect.w, y: rect.y + rect.h });
    for (let r = r1 - margin; r <= r2 + margin; r++)
      for (let c = c1 - margin; c <= c2 + margin; c++)
        if (this.inside(c, r)) this.blocked[this.idx(c, r)] = 1;
  }
  free(c: number, r: number): void {
    if (this.inside(c, r)) this.blocked[this.idx(c, r)] = 0;
  }
}
