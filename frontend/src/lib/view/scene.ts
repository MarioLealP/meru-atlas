// Layout + routing for a graph, in two steps so the boxes paint at once: the column layout
// is synchronous and cheap; the lines are routed in a worker and arrive a moment later
// (they only show on demand anyway). Paths are SVG strings by edge index.
import type { Model } from "../graph/model";
import { layoutColumns, titleBars, type Layout } from "../layout/columns";
import type { Pt } from "../router";
import { routeInWorker } from "../router/client";
import type { RouteJob } from "../router/worker";
import { roundedPath } from "./path";

export type Lines = { paths: Map<number, string>; points: Map<number, Pt[]> };
export type Scene = { layout: Layout } & Lines;

export function routeJob(m: Model, l: Layout): RouteJob {
  return {
    rects: [...l.nodes.values()],
    edges: m.edges
      .filter((e) => l.nodes.has(e.from) && l.nodes.has(e.to))
      .map((e) => ({ id: String(e.i), from: e.from, to: e.to })),
    obstacles: titleBars(l),
  };
}

/** The boxes, now; no lines yet. */
export const layoutScene = (m: Model): Scene => ({
  layout: layoutColumns(m.g),
  paths: new Map(),
  points: new Map(),
});

/** Every line, routed off the main thread. */
export async function routeScene(m: Model, layout: Layout): Promise<Lines> {
  const { routed } = await routeInWorker(routeJob(m, layout));
  const lines: Lines = { paths: new Map(), points: new Map() };
  for (const r of routed)
    if (r.ok) {
      lines.paths.set(Number(r.id), roundedPath(r.points));
      lines.points.set(Number(r.id), r.points);
    }
  return lines;
}
