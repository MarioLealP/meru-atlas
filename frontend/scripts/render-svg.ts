// dev-only: render graph.json with the column layout + router to an SVG (visual check)
import { readFileSync, writeFileSync } from "node:fs";
import { layoutColumns, titleBars } from "../src/lib/layout/columns";
import { routeAll } from "../src/lib/router";
import { Graph } from "../src/lib/schemas";

const g = Graph.parse(JSON.parse(readFileSync(process.argv[2]!, "utf8")));
const kinds = new Set((process.argv[4] ?? "traffic,data,watch,alert,ship,backup").split(","));
const L = layoutColumns(g);
const edges = g.edges
  .filter((e) => kinds.has(e.kind))
  .map((e, i) => ({ id: `e${i}`, from: e.from, to: e.to, kind: e.kind }));
const t0 = performance.now();
const routed = routeAll([...L.nodes.values()], edges, {}, titleBars(L));
const ms = performance.now() - t0;
const col: Record<string, string> = {
  traffic: "#e7e6e1",
  route: "#6c6f75",
  sso: "#6fcf8a",
  data: "#7aa7da",
  watch: "#f2c300",
  alert: "#ff6b5f",
  ship: "#b49cf0",
  backup: "#5fc9c4",
};
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${L.width}" height="${L.height}" style="background:#131416;font-family:sans-serif">`;
for (const z of L.zones)
  s += `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="#1b1d20" stroke="#33363b"/><rect x="${z.x}" y="${z.y}" width="${z.w}" height="40" fill="#e7e6e1" fill-opacity="0.9"/><text x="${z.x + 12}" y="${z.y + 28}" fill="#131416" font-size="20" font-weight="700">${esc(z.title.toUpperCase())}</text>`;
const kindOf = new Map(edges.map((e) => [e.id, e.kind]));
for (const r of routed)
  s += `<polyline fill="none" stroke="${r.ok ? col[kindOf.get(r.id)!] : "#f0f"}" stroke-width="2.4" stroke-linejoin="round" points="${r.points.map((p) => `${p.x},${p.y}`).join(" ")}"/>`;
const byId = new Map(g.nodes.map((n) => [n.id, n]));
for (const [id, b] of L.nodes)
  s += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#202327" stroke="#666"/><text x="${b.x + 14}" y="${b.y + 32}" fill="#e7e6e1" font-size="19">${esc(byId.get(id)!.label)}</text>`;
writeFileSync(process.argv[3]!, s + "</svg>");
console.log(
  `${routed.length} edges, ${routed.filter((r) => !r.ok).length} unrouted, ${ms.toFixed(0)} ms, ${L.width}x${L.height}`,
);
