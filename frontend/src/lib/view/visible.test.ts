import { describe, expect, it } from "vitest";
import { Model } from "../graph/model";
import type { Graph } from "../schemas";
import { KINDS } from "../state.svelte";
import { visible, type Focus } from "./visible";

const g: Graph = {
  schema_version: 1,
  zones: [{ id: "z", title: "Z" }],
  nodes: ["a", "b", "c"].map((id) => ({ id, label: id, zone: "z" })),
  edges: [
    { from: "a", to: "b", kind: "traffic" },
    { from: "b", to: "c", kind: "watch" },
  ],
};
const m = new Model(g);
const all = Object.fromEntries(KINDS.map(([k]) => [k, true])) as Focus["layers"];
const f = (o: Partial<Focus>): Focus => ({
  selected: null,
  hover: null,
  trace: null,
  allLines: false,
  layers: all,
  ...o,
});

describe("visible", () => {
  it("draws nothing in the overview by default", () => {
    expect(visible(m, f({})).edges).toHaveLength(0);
    expect(visible(m, f({ allLines: true })).edges).toHaveLength(2);
  });
  it("previews the hovered unit's lines without dimming", () => {
    const v = visible(m, f({ hover: "a" }));
    expect(v.edges.map((e) => e.i)).toEqual([0]);
    expect(v.lit).toBeNull();
  });
  it("focus shows only that unit's lines, respecting layers, and lights its peers", () => {
    const v = visible(m, f({ selected: "b", layers: { ...all, watch: false } }));
    expect(v.edges.map((e) => e.i)).toEqual([0]);
    expect([...v.lit!].sort()).toEqual(["a", "b"]);
  });
  it("a trace wins over everything", () => {
    const v = visible(m, f({ selected: "c", trace: { path: ["a", "b"], edges: [0] } }));
    expect(v.edges.map((e) => e.i)).toEqual([0]);
  });
});
