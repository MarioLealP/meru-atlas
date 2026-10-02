// Deep links: #u=<unit> selects a unit, #r=<from>,<to> shows a traced route, #v=list opens
// the catalogue. Ids are checked against a strict pattern before they reach the model.
export type Deep = { unit?: string; route?: [string, string]; list?: boolean };
const ID = /^[a-z0-9_-]{1,64}$/;

export function readHash(h = location.hash): Deep {
  const q = new URLSearchParams(h.replace(/^#/, ""));
  const u = q.get("u"),
    r = q.get("r")?.split(",");
  return {
    unit: u && ID.test(u) ? u : undefined,
    route: r?.length === 2 && r.every((x) => ID.test(x)) ? [r[0]!, r[1]!] : undefined,
    list: q.get("v") === "list" || undefined,
  };
}
export function writeHash(d: Deep) {
  const q = new URLSearchParams();
  if (d.list) q.set("v", "list");
  else if (d.route) q.set("r", d.route.join(","));
  else if (d.unit) q.set("u", d.unit);
  const s = q.toString();
  history.replaceState(null, "", s ? `#${s}` : location.pathname + location.search);
}
