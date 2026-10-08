import { describe, expect, it } from "vitest";
import { Docs, type DocPage } from "../schemas";
import { attention, DocIndex, isStale, search } from "./pages";

const page = (id: string, extra: Partial<DocPage> = {}): DocPage => ({
  id,
  title: id[0]!.toUpperCase() + id.slice(1),
  kind: "app",
  path: `docs/${id}.md`,
  status: "active",
  verified: "2026-10-01",
  relations: [],
  backrefs: [],
  children: [],
  sections: [{ title: "What it is", blocks: [{ html: `<p>${id} text</p>` }] }],
  ...extra,
});
const NOW = Date.parse("2026-10-08");

describe("docs", () => {
  it("validates and indexes by id and node", () => {
    const d = Docs.parse({
      schema_version: 1,
      pages: [page("zabbix", { node: "zabbix" })],
      uncovered_nodes: [],
    });
    const ix = new DocIndex(d);
    expect(ix.byNode.get("zabbix")?.id).toBe("zabbix");
    expect(ix.title("nope")).toBe("nope");
  });
  it("flags pages that are not active or not verified for 60 days", () => {
    const old = page("old", { verified: "2026-07-01" });
    const junk = page("junk", { status: "junk?" });
    expect(isStale(old, NOW)).toBe(true);
    expect(attention([page("ok"), old, junk], NOW).map((p) => p.id)).toEqual(["old", "junk"]);
  });
  it("ranks title hits over body hits and strips tags", () => {
    const a = page("agent", {
      sections: [{ title: "What it is", blocks: [{ html: "<p>talks to <b>zabbix</b></p>" }] }],
    });
    expect(search([a, page("zabbix")], "zabbix").map((p) => p.id)).toEqual(["zabbix", "agent"]);
    expect(search([a], "<b>")).toEqual([]);
  });
});
