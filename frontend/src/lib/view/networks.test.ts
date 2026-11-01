import { describe, expect, it } from "vitest";
import { Model } from "../graph/model";
import { sharedNetworks } from "./networks";

const m = new Model({
  schema_version: 1,
  zones: [{ id: "z", title: "Z" }],
  nodes: [
    { id: "authentik", label: "Authentik", zone: "z", networks: ["authentik", "front-authentik"] },
    { id: "caddy", label: "Caddy", zone: "z", networks: ["authentik", "front-gitea", "mon"] },
    { id: "whoami", label: "whoami", zone: "z", networks: ["authentik"] },
    { id: "zabbix", label: "Zabbix", zone: "z", networks: ["mon", "host"] },
    { id: "gitea", label: "Gitea", zone: "z", networks: ["front-gitea", "host"] },
  ],
  edges: [],
});
const nets = sharedNetworks(m);

describe("sharedNetworks", () => {
  it("keeps networks shared by 2+ units, skips front-* and host", () => {
    expect(nets.map((n) => n.name).sort()).toEqual(["authentik", "mon"]);
  });
  it("flags strays on the authentik network, and sorts flagged first", () => {
    expect(nets[0]).toMatchObject({ name: "authentik", flag: "whoami: can reach authentik's internals" });
    expect(nets.find((n) => n.name === "mon")!.flag).toBeUndefined();
  });
});
