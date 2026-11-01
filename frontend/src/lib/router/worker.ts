// Routes all lines off the main thread. Input/output are plain JSON.
import { routeAll } from "./route";
import type { EdgeReq, Rect, Routed } from "./types";

export type RouteJob = { rects: Rect[]; edges: EdgeReq[]; obstacles: Rect[] };

self.onmessage = (e: MessageEvent<RouteJob>) => {
  const t0 = performance.now();
  const routed: Routed[] = routeAll(e.data.rects, e.data.edges, {}, e.data.obstacles);
  self.postMessage({ routed, ms: performance.now() - t0 });
};
