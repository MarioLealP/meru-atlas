// Pan / zoom / pinch for an SVG "world" group. Pointer capture happens only once a real
// drag starts: capturing on pointerdown made desktop browsers deliver the click to the svg
// instead of the unit under the mouse (v0 bug, 2026-10-01).
export const TOP_BAR = 56; // px of toolbar overlaying the top of the map
export type View = { x: number; y: number; k: number };
type Bounds = { x: number; y: number; w: number; h: number };

export function panzoom(svg: SVGSVGElement, onChange: (v: View) => void, opts = { min: 0.12, max: 3 }) {
  let v: View = { x: 0, y: 0, k: 1 };
  let moved = false;
  const pts = new Map<number, { x: number; y: number }>();
  let start: { x: number; y: number; vx: number; vy: number } | null = null;
  let pinch: { d: number; k: number } | null = null;
  const emit = () => onChange({ ...v });
  const rect = () => svg.getBoundingClientRect();

  function zoomAt(cx: number, cy: number, f: number) {
    const k = Math.min(opts.max, Math.max(opts.min, v.k * f));
    const s = k / v.k;
    v = { x: cx - (cx - v.x) * s, y: cy - (cy - v.y) * s, k };
    emit();
  }
  /** Fit `b` into the viewport minus overlays: `top` px (toolbar) and `right` px (card). */
  function fit(b: Bounds, top = 0, right = 0, margin = 0.97, kMax = opts.max) {
    const r = rect();
    const w = r.width - right,
      h = r.height - top;
    const k = Math.min(kMax, Math.min(w / b.w, h / b.h) * margin);
    v = { k, x: (w - b.w * k) / 2 - b.x * k, y: top + (h - b.h * k) / 2 - b.y * k };
    emit();
  }
  function centerOn(x: number, y: number, k = Math.max(v.k, 0.8)) {
    const r = rect();
    v = { k, x: r.width / 2 - x * k, y: r.height / 2 - y * k };
    emit();
  }

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const r = rect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0016));
  };
  const onDown = (e: PointerEvent) => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = false;
    start = { x: e.clientX, y: e.clientY, vx: v.x, vy: v.y };
    if (pts.size === 2) {
      const [a, b] = [...pts.values()] as [{ x: number; y: number }, { x: number; y: number }];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: v.k };
      pts.forEach((_, id) => svg.setPointerCapture(id));
    }
  };
  const onMove = (e: PointerEvent) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2 && pinch) {
      const [a, b] = [...pts.values()] as [{ x: number; y: number }, { x: number; y: number }];
      const r = rect();
      zoomAt(
        (a.x + b.x) / 2 - r.left,
        (a.y + b.y) / 2 - r.top,
        (pinch.k * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d / v.k,
      );
      moved = true;
      return;
    }
    if (pts.size === 1 && start) {
      const dx = e.clientX - start.x,
        dy = e.clientY - start.y;
      if (!moved && Math.abs(dx) + Math.abs(dy) > 5) {
        moved = true;
        svg.setPointerCapture(e.pointerId);
        svg.classList.add("dragging");
      }
      if (moved) {
        v = { ...v, x: start.vx + dx, y: start.vy + dy };
        emit();
      }
    }
  };
  const onUp = (e: PointerEvent) => {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (!pts.size) {
      svg.classList.remove("dragging");
      setTimeout(() => (moved = false), 0);
    }
  };
  svg.addEventListener("wheel", onWheel, { passive: false });
  svg.addEventListener("pointerdown", onDown);
  svg.addEventListener("pointermove", onMove);
  svg.addEventListener("pointerup", onUp);
  svg.addEventListener("pointercancel", onUp);
  return {
    zoomAt,
    fit,
    centerOn,
    wasDrag: () => moved,
    zoomBy: (f: number) => {
      const r = rect();
      zoomAt(r.width / 2, r.height / 2, f);
    },
    destroy() {
      svg.removeEventListener("wheel", onWheel);
      svg.removeEventListener("pointerdown", onDown);
      svg.removeEventListener("pointermove", onMove);
      svg.removeEventListener("pointerup", onUp);
      svg.removeEventListener("pointercancel", onUp);
    },
  };
}
