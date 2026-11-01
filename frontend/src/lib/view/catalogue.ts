// Unit catalogue rows (v0 sheet 07): every service unit, what it does, how you reach it,
// how it logs you in, its networks and what it talks to. Pure, tested.
import type { Model, Node } from "../graph/model";

export type Pill = { label: string; kind: "sso" | "pub" | "none" | "note" };
export type Row = {
  id: string;
  zone: string;
  label: string;
  sub: string;
  does: string;
  version: string;
  reach: string[];
  logins: Pill[];
  networks: string[];
  talks: string[];
};

/** A service unit: something the repo runs (containers) or routes to (web routes). */
const isService = (n: Node) => !!(n.containers?.length || n.routes?.length);

export function catalogue(m: Model): Row[] {
  const order = new Map(m.g.zones.map((z) => [z.id, z.order ?? 0]));
  return [...m.nodes.values()]
    .filter(isService)
    .sort((a, b) => (order.get(a.zone) ?? 0) - (order.get(b.zone) ?? 0) || (a.rank ?? 0) - (b.rank ?? 0))
    .map((n) => {
      const routes = n.routes ?? [];
      const logins: Pill[] = [];
      for (const r of routes)
        if (!logins.some((p) => p.label === r.login))
          logins.push({ label: r.login, kind: r.sso ? "sso" : "none" });
      if (routes.some((r) => r.public)) logins.push({ label: "public", kind: "pub" });
      if (n.login_note) logins.push({ label: n.login_note, kind: "note" });
      // "talks to": real connections, not the Caddy route / Authentik login every app has
      const talks = m
        .edgesOf(n.id)
        .filter((e) => e.kind !== "route" && e.kind !== "sso")
        .map((e) => m.nodes.get(e.from === n.id ? e.to : e.from)!.label);
      return {
        id: n.id,
        zone: n.zone,
        label: n.label,
        sub: n.sub ?? "",
        does: n.does ?? n.sub ?? "",
        version: n.version ?? "",
        reach: [...routes.map((r) => r.host), ...(n.ports ?? [])],
        logins,
        networks: n.networks ?? [],
        talks: [...new Set(talks)].sort((a, b) => a.localeCompare(b)),
      };
    });
}

/** Rows in `zone` ("all" for every zone) whose text contains every word of `q`. */
export function filterRows(rows: Row[], zone: string, q: string): Row[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter((r) => {
    if (zone !== "all" && r.zone !== zone) return false;
    const logins = r.logins.map((p) => p.label);
    const text = [r.label, r.sub, r.does, r.version, ...r.reach, ...logins, ...r.networks, ...r.talks]
      .join(" ")
      .toLowerCase();
    return words.every((w) => text.includes(w));
  });
}
