import { describe, expect, it } from "vitest";
import { Model } from "../graph/model";
import type { Graph } from "../schemas";
import { exposure } from "./exposure";

const node = (id: string, extra: Partial<Graph["nodes"][number]> = {}) => ({
  id,
  label: id[0]!.toUpperCase() + id.slice(1),
  zone: "z",
  ...extra,
});
const g: Graph = {
  schema_version: 1,
  router_forwards: [{ proto: "udp", port: 34197, target: "Factorio" }],
  zones: [{ id: "z", title: "Z" }],
  nodes: [
    node("internet"),
    node("cloudflare"),
    node("cloudflared"),
    node("caddy"),
    node("vodafone"),
    node("r7000"),
    node("gitea", {
      public: true,
      routes: [{ host: "git.clockmost.com", login: "SSO (OIDC)", sso: true, public: true }],
    }),
    node("immich", {
      routes: [{ host: "immich.clockmost.com", login: "SSO (OIDC)", sso: true, public: false }],
    }),
    node("factorio"),
  ],
  edges: [
    { from: "internet", to: "cloudflare", kind: "traffic" },
    { from: "cloudflare", to: "cloudflared", kind: "traffic" },
    { from: "cloudflared", to: "caddy", kind: "traffic" },
    { from: "caddy", to: "gitea", kind: "route" },
    { from: "caddy", to: "immich", kind: "route" },
    { from: "internet", to: "vodafone", kind: "traffic" },
    { from: "vodafone", to: "r7000", kind: "traffic" },
    { from: "r7000", to: "factorio", kind: "traffic" },
  ],
};
const x = exposure(new Model(g));

describe("exposure", () => {
  it("finds public apps and port-forward targets, not LAN-only apps", () => {
    expect(x.targets.sort()).toEqual(["factorio", "gitea"]);
    expect(x.lit.has("immich")).toBe(false);
  });
  it("lights the request paths to them", () => {
    for (const id of ["internet", "cloudflare", "cloudflared", "caddy", "vodafone", "r7000"])
      expect(x.lit.has(id)).toBe(true);
    expect(x.edges.length).toBe(7); // every edge except caddy → immich
  });
  it("says why each one is exposed", () => {
    expect(x.why.get("gitea")).toBe("public · SSO (OIDC)");
    expect(x.why.get("factorio")).toBe("port udp 34197");
  });
});
