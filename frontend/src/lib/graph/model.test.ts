import { describe, expect, it } from "vitest";
import type { Graph } from "../schemas";
import { Model } from "./model";

const n = (id: string, extra: Partial<Graph["nodes"][number]> = {}) => ({
  id,
  label: id,
  zone: "z",
  ...extra,
});
const g: Graph = {
  schema_version: 1,
  zones: [{ id: "z", title: "Z" }],
  router_forwards: [{ proto: "tcp", port: 51820, target: "headscale" }],
  nodes: [
    n("internet"),
    n("cloudflare"),
    n("cloudflared"),
    n("caddy"),
    n("vodafone"),
    n("r7000"),
    n("phone"),
    n("headscale"),
    n("immich"),
    n("git", { public: true }),
    n("zabbix"),
  ],
  edges: [
    { from: "internet", to: "cloudflare", kind: "traffic" },
    { from: "cloudflare", to: "cloudflared", kind: "traffic" },
    { from: "cloudflared", to: "caddy", kind: "traffic" },
    { from: "internet", to: "vodafone", kind: "traffic" },
    { from: "vodafone", to: "r7000", kind: "traffic" },
    { from: "r7000", to: "caddy", kind: "traffic" },
    { from: "caddy", to: "headscale", kind: "traffic" },
    { from: "phone", to: "headscale", kind: "traffic" },
    { from: "headscale", to: "caddy", kind: "traffic" },
    { from: "caddy", to: "immich", kind: "route" },
    { from: "caddy", to: "git", kind: "route" },
    { from: "immich", to: "zabbix", kind: "watch" },
  ],
};
const m = new Model(g);

describe("Model", () => {
  it("indexes peers both ways", () => {
    expect(m.peers("headscale")).toEqual(["caddy", "phone"]);
  });
  it("routes a public app through the tunnel", () => {
    expect(m.trace("internet", "git")!.path).toEqual([
      "internet",
      "cloudflare",
      "cloudflared",
      "caddy",
      "git",
    ]);
  });
  it("has no internet route to a private app (the security answer)", () => {
    expect(m.trace("internet", "immich")).toBeNull();
  });
  it("only lets the router forward reach its target", () => {
    expect(m.trace("internet", "headscale")!.path).toEqual([
      "internet",
      "vodafone",
      "r7000",
      "caddy",
      "headscale",
    ]);
  });
  it("reaches private apps over the VPN", () => {
    expect(m.trace("phone", "immich")!.path).toEqual(["phone", "headscale", "caddy", "immich"]);
  });
  it("ignores monitoring lines and direction", () => {
    expect(m.trace("zabbix", "immich")).toBeNull();
  });
  it("handles unknown ids", () => {
    expect(m.trace("nope", "git")).toBeNull();
  });
});
