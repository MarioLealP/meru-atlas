// Layout + routing for a graph: boxes from the column layout, every line routed once (in a
// worker), stored as SVG path strings by edge index.
import type { Model } from "../graph/model";
import type { Pt } from "../router";
import { layoutColumns, titleBars, type Layout } from "../layout/columns";
import { routeInWorker } from "../router/client";
import type { RouteJob } from "../router/worker";
import { roundedPath } from "./path";

export function routeJob(m: Model, l: Layout): RouteJob {
  return {
    rects: [...l.nodes.values()],
    edges: m.edges
      .filter((e) => l.nodes.has(e.from) && l.nodes.has(e.to))
      .map((e) => ({ id: String(e.i), from: e.from, to: e.to })),
    obstacles: titleBars(l),
  };
}

export async function buildScene(m: Model): Promise<{
  layout: Layout;
  paths: Map<number, string>;
  points: Map<number, Pt[]>;
  unrouted: number;
  ms: number;
}> {
  const layout = layoutColumns(m.g);
  const { routed, ms } = await routeInWorker(routeJob(m, layout));
  const paths = new Map<number, string>();
  const points = new Map<number, Pt[]>();
  for (const r of routed)
    if (r.ok) {
      paths.set(Number(r.id), roundedPath(r.points));
      points.set(Number(r.id), r.points);
    }
  return { layout, paths, points, unrouted: routed.filter((r) => !r.ok).length, ms };
}
