// Fixed column layout: zones left-to-right by `order`, units top-to-bottom by `rank`, strip
// zones (platform) full-width below and wrapping. Everything snaps to the routing grid.
import type { Graph } from "../schemas";
import type { Rect } from "../router";

export const GEO = {
  nodeW: 250,
  nodeH: 80,
  rowPitch: 120,
  colW: 330,
  colGap: 110, // routing channel between columns (lanes)
  band: 50, // zone title band
  pad: 30,
  stripGap: 80,
  grid: 10,
};

export type ZoneBox = { id: string; title: string; x: number; y: number; w: number; h: number };
export type Layout = { nodes: Map<string, Rect>; zones: ZoneBox[]; width: number; height: number };

const snap = (v: number) => Math.round(v / GEO.grid) * GEO.grid;

export function layoutColumns(g: Graph): Layout {
  const zones = [...g.zones].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const cols = zones.filter((z) => !z.strip);
  const strips = zones.filter((z) => z.strip);
  const inZone = (id: string) =>
    g.nodes
      .filter((n) => n.zone === id)
      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.label.localeCompare(b.label));
  const nodes = new Map<string, Rect>();
  const out: ZoneBox[] = [];
  const top = GEO.pad;
  const rows = Math.max(1, ...cols.map((z) => inZone(z.id).length));
  const colH = GEO.band + GEO.pad + rows * GEO.rowPitch;

  cols.forEach((z, i) => {
    const x = snap(GEO.pad + i * (GEO.colW + GEO.colGap));
    out.push({ id: z.id, title: z.title, x, y: top, w: GEO.colW, h: colH });
    inZone(z.id).forEach((n, r) => {
      nodes.set(n.id, {
        id: n.id,
        x: snap(x + (GEO.colW - GEO.nodeW) / 2),
        y: snap(top + GEO.band + GEO.pad + r * GEO.rowPitch),
        w: GEO.nodeW,
        h: GEO.nodeH,
      });
    });
  });

  const fullW = cols.length * (GEO.colW + GEO.colGap) - GEO.colGap;
  let y = top + colH + GEO.stripGap;
  for (const z of strips) {
    const list = inZone(z.id);
    const per = Math.max(1, Math.floor((fullW - GEO.pad) / (GEO.nodeW + GEO.colGap)));
    const lines = Math.max(1, Math.ceil(list.length / per));
    const h = GEO.band + GEO.pad + lines * GEO.rowPitch;
    out.push({ id: z.id, title: z.title, x: GEO.pad, y, w: fullW, h });
    list.forEach((n, i) => {
      nodes.set(n.id, {
        id: n.id,
        x: snap(GEO.pad * 2 + (i % per) * (GEO.nodeW + GEO.colGap)),
        y: snap(y + GEO.band + GEO.pad + Math.floor(i / per) * GEO.rowPitch),
        w: GEO.nodeW,
        h: GEO.nodeH,
      });
    });
    y += h + GEO.stripGap;
  }
  return { nodes, zones: out, width: fullW + 2 * GEO.pad, height: y };
}
