// Network lens: which units share a Docker network. Skips each app's private front-<app>
// link to Caddy and `host` (noise, by design); flags units on the `authentik` network that
// aren't Authentik or Caddy, since they can reach Authentik's Postgres and Redis (the v0
// generated check). Pure, tested.
import type { Model } from "../graph/model";

export type Net = { name: string; units: string[]; flag?: string };

const OWNERS: Record<string, string[]> = { authentik: ["authentik", "caddy"] };

export function sharedNetworks(m: Model): Net[] {
  const by = new Map<string, string[]>();
  for (const n of m.nodes.values())
    for (const net of n.networks ?? [])
      if (!net.startsWith("front-") && net !== "host") by.set(net, [...(by.get(net) ?? []), n.id]);
  return [...by]
    .filter(([, units]) => units.length > 1)
    .map(([name, units]): Net => {
      const stray = OWNERS[name] ? units.filter((u) => !OWNERS[name]!.includes(u)) : [];
      if (!stray.length) return { name, units };
      const labels = stray.map((u) => m.nodes.get(u)!.label).join(", ");
      return { name, units, flag: `${labels}: can reach ${name}'s internals` };
    })
    .sort((a, b) => Number(!!b.flag) - Number(!!a.flag) || b.units.length - a.units.length);
}
