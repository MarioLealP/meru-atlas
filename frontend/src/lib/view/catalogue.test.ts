import { describe, expect, it } from "vitest";
import { Model } from "../graph/model";
import type { Graph } from "../schemas";
import { catalogue, filterRows } from "./catalogue";

const g: Graph = {
  schema_version: 1,
  zones: [
    { id: "edge", title: "Edge", order: 1 },
    { id: "apps", title: "Apps", order: 2 },
  ],
  nodes: [
    { id: "phone", label: "Phone", zone: "edge" },
    { id: "caddy", label: "Caddy", zone: "edge", containers: ["caddy"] },
    {
      id: "gitea",
      label: "Gitea",
      zone: "apps",
      containers: ["gitea-server"],
      networks: ["front-gitea"],
      ports: ["2222:22"],
      login_note: "SSH keys",
      routes: [{ host: "git.clockmost.com", login: "SSO (OIDC)", sso: true, public: true }],
    },
    { id: "runner", label: "Runner", zone: "apps", containers: ["runner"] },
  ],
  edges: [
    { from: "caddy", to: "gitea", kind: "route" },
    { from: "runner", to: "gitea", kind: "ship" },
  ],
};
const rows = catalogue(new Model(g));

describe("catalogue", () => {
  it("lists only service units, in zone order", () => {
    expect(rows.map((r) => r.id)).toEqual(["caddy", "gitea", "runner"]);
  });
  it("builds reach, login pills and real peers", () => {
    const gitea = rows.find((r) => r.id === "gitea")!;
    expect(gitea.reach).toEqual(["git.clockmost.com", "2222:22"]);
    expect(gitea.logins).toEqual([
      { label: "SSO (OIDC)", kind: "sso" },
      { label: "public", kind: "pub" },
      { label: "SSH keys", kind: "note" },
    ]);
    expect(gitea.talks).toEqual(["Runner"]); // the Caddy route line is not a "talks to"
  });
  it("filters by zone and by every search word", () => {
    expect(filterRows(rows, "apps", "").map((r) => r.id)).toEqual(["gitea", "runner"]);
    expect(filterRows(rows, "all", "front-gitea").map((r) => r.id)).toEqual(["gitea"]);
    expect(filterRows(rows, "all", "gitea runner").map((r) => r.id)).toEqual(["gitea", "runner"]);
    expect(filterRows(rows, "all", "oidc public").map((r) => r.id)).toEqual(["gitea"]);
    expect(filterRows(rows, "edge", "gitea")).toEqual([]);
  });
});
