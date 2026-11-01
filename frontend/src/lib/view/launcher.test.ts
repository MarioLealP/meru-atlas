import { describe, expect, it } from "vitest";
import { Model } from "../graph/model";
import { entries, rank, score } from "./launcher";

const m = new Model({
  schema_version: 1,
  zones: [{ id: "z", title: "Z" }],
  nodes: [
    {
      id: "gitea",
      label: "Gitea",
      zone: "z",
      links: [{ title: "Gitea", url: "https://git.clockmost.com/" }],
    },
    {
      id: "zabbix",
      label: "Zabbix",
      zone: "z",
      links: [
        { title: "web", url: "https://zabbix.clockmost.com/" },
        { title: "api", url: "https://zabbix.clockmost.com/api_jsonrpc.php" },
      ],
    },
    { id: "tang", label: "tang", zone: "z", sub: "NBDE" },
  ],
  edges: [],
});
const all = entries(m);

describe("launcher", () => {
  it("has one entry per link, and units without links for the map", () => {
    expect(all.map((e) => e.title)).toEqual(["Gitea", "Zabbix · web", "Zabbix · api", "tang"]);
    expect(all[0]).toMatchObject({ hint: "git.clockmost.com", url: "https://git.clockmost.com/" });
    expect(all[3]!.url).toBeUndefined();
  });
  it("scores word starts over substrings over letters in order", () => {
    expect(score("Zabbix · web", "web")).toBe(3);
    expect(score("Gitea", "ite")).toBe(2);
    expect(score("Gitea", "gta")).toBe(1);
    expect(score("Gitea", "xyz")).toBe(0);
  });
  it("ranks, and shows only openable links for an empty query", () => {
    expect(rank(all, "zab").map((e) => e.title)).toEqual(["Zabbix · api", "Zabbix · web"]);
    expect(rank(all, "gta")[0]!.unit).toBe("gitea");
    expect(rank(all, "tang")[0]!.unit).toBe("tang");
    expect(rank(all, "").every((e) => e.url)).toBe(true);
  });
});
