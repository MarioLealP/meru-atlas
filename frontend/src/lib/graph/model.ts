// Pure graph model: indexes, adjacency, focus peers, route tracing. No DOM, fully testable.
import type { Graph } from "../schemas";

export type Node = Graph["nodes"][number];
export type Edge = Graph["edges"][number] & { i: number };

export class Model {
  readonly nodes: Map<string, Node>;
  readonly edges: Edge[];
  readonly adj: Map<string, Edge[]>;
  readonly forwardTargets: Set<string>; // node ids the router forwards reach

  constructor(readonly g: Graph) {
    this.nodes = new Map(g.nodes.map((n) => [n.id, n]));
    this.edges = g.edges.map((e, i) => ({ ...e, i }));
    this.adj = new Map();
    for (const e of this.edges)
      for (const id of [e.from, e.to]) {
        if (!this.adj.has(id)) this.adj.set(id, []);
        this.adj.get(id)!.push(e);
      }
    const fwdLabels = new Set((g.router_forwards ?? []).map((f) => f.target));
    this.forwardTargets = new Set(g.nodes.filter((n) => fwdLabels.has(n.label)).map((n) => n.id));
  }

  edgesOf(id: string): Edge[] {
    return this.adj.get(id) ?? [];
  }

  /** Units directly linked to `id`, sorted by label. */
  peers(id: string): string[] {
    const ids = new Set(this.edgesOf(id).map((e) => (e.from === id ? e.to : e.from)));
    return [...ids].sort((a, b) => this.nodes.get(a)!.label.localeCompare(this.nodes.get(b)!.label));
  }

  /**
   * Shortest route a request could take from `a` to `b`: only request-carrying lines
   * (traffic/route/data/sso) in their direction; the tunnel only leads to public apps and
   * the router forwards only reach their targets. null = unreachable (a security answer).
   */
  trace(a: string, b: string): { path: string[]; edges: Edge[] } | null {
    if (!this.nodes.has(a) || !this.nodes.has(b)) return null;
    const REQ = new Set(["traffic", "route", "data", "sso"]);
    const target = this.nodes.get(b)!;
    const prev = new Map<string, { from: string; e: Edge } | null>([[a, null]]);
    const queue = [a];
    while (queue.length) {
      const x = queue.shift()!;
      if (x === b) break;
      for (const e of this.edgesOf(x)) {
        if (!REQ.has(e.kind) || e.from !== x) continue;
        if (x === "cloudflared" && e.to === "caddy" && !target.public && b !== "caddy") continue;
        if (x === "vodafone" && e.to === "r7000" && !this.forwardTargets.has(b)) continue;
        if (!prev.has(e.to)) {
          prev.set(e.to, { from: x, e });
          queue.push(e.to);
        }
      }
    }
    if (!prev.has(b)) return null;
    const path: string[] = [],
      edges: Edge[] = [];
    for (let x: string = b; x !== a;) {
      const p = prev.get(x)!;
      path.unshift(x);
      edges.unshift(p!.e);
      x = p!.from;
    }
    return { path: [a, ...path], edges };
  }
}
