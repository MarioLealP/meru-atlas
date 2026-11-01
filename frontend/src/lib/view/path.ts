// Orthogonal polyline → SVG path with small rounded corners (no hop arcs: Mario, 2026-10-01).
import type { Pt } from "../router";

export function roundedPath(pts: Pt[], r = 6): string {
  if (pts.length < 2) return "";
  // drop collinear points so every remaining interior point is a real bend
  const p = pts.filter((q, i) => {
    if (i === 0 || i === pts.length - 1) return true;
    const a = pts[i - 1]!,
      b = pts[i + 1]!;
    return !((a.x === q.x && q.x === b.x) || (a.y === q.y && q.y === b.y));
  });
  let d = `M${p[0]!.x},${p[0]!.y}`;
  for (let i = 1; i < p.length - 1; i++) {
    const a = p[i - 1]!,
      b = p[i]!,
      c = p[i + 1]!;
    const k = Math.min(r, Math.hypot(b.x - a.x, b.y - a.y) / 2, Math.hypot(c.x - b.x, c.y - b.y) / 2);
    const ux = Math.sign(b.x - a.x),
      uy = Math.sign(b.y - a.y);
    const vx = Math.sign(c.x - b.x),
      vy = Math.sign(c.y - b.y);
    d += `L${b.x - ux * k},${b.y - uy * k}Q${b.x},${b.y} ${b.x + vx * k},${b.y + vy * k}`;
  }
  const z = p[p.length - 1]!;
  return `${d}L${z.x},${z.y}`;
}
