// dev-only: time layout+routing of a graph.json exactly as the app does (all kinds)
import { readFileSync } from "node:fs";
import { Model } from "../src/lib/graph/model";
import { layoutColumns } from "../src/lib/layout/columns";
import { routeAll } from "../src/lib/router";
import { Graph } from "../src/lib/schemas";
import { routeJob } from "../src/lib/view/scene";

const m = new Model(Graph.parse(JSON.parse(readFileSync(process.argv[2]!, "utf8"))));
const job = routeJob(m, layoutColumns(m.g));
const t0 = performance.now();
const r = routeAll(job.rects, job.edges, {}, job.obstacles);
console.log(
  `${r.length} lines, ${r.filter((x) => !x.ok).length} unrouted, ${(performance.now() - t0).toFixed(0)} ms`,
);
