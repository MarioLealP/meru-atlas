// Exposure lens: what the internet can reach. Every unit the route tracer can reach from
// "internet" (public apps through the tunnel, router port forwards), the request paths
// to them, and why each one is exposed. Built on Model.trace, so the lens and "trace a
// route" can never disagree. Pure, tested.
import type { Model } from "../graph/model";

export const ORIGIN = "internet";
export type Exposure = { targets: string[]; lit: Set<string>; edges: number[]; why: Map<string, string> };

export function exposure(m: Model): Exposure {
  const forwards = new Map<string, string[]>();
  for (const f of m.g.router_forwards ?? []) {
    const n = [...m.nodes.values()].find((x) => x.label === f.target);
    if (n) forwards.set(n.id, [...(forwards.get(n.id) ?? []), `${f.proto} ${f.port}`]);
  }
  const why = new Map<string, string>();
  for (const n of m.nodes.values()) {
    const parts: string[] = [];
    if (n.public) {
      const logins = [...new Set((n.routes ?? []).filter((r) => r.public).map((r) => r.login))];
      parts.push(["public", ...logins].join(" · "));
    }
    if (forwards.has(n.id)) parts.push(`port ${forwards.get(n.id)!.join(", ")}`);
    if (parts.length) why.set(n.id, parts.join(" · "));
  }
  const lit = new Set<string>([ORIGIN]);
  const edges = new Set<number>();
  const targets: string[] = [];
  for (const id of why.keys()) {
    const t = m.trace(ORIGIN, id);
    if (!t) continue; // declared public but not actually reachable: not exposure
    targets.push(id);
    t.path.forEach((x) => lit.add(x));
    t.edges.forEach((e) => edges.add(e.i));
  }
  for (const id of why.keys()) if (!targets.includes(id)) why.delete(id);
  return { targets, lit, edges: [...edges], why };
}
