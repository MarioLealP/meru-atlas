import { describe, expect, it } from "vitest";
import { Model } from "../graph/model";
import type { UnitLive } from "../live/health";
import { wallList } from "./wall";

const m = new Model({
  schema_version: 1,
  zones: [{ id: "z", title: "Z" }],
  nodes: [
    { id: "a", label: "A", zone: "z", links: [{ title: "a", url: "https://a.example/" }] },
    { id: "b", label: "B", zone: "z" },
    { id: "c", label: "C", zone: "z" },
  ],
  edges: [],
});
const lv = (level: UnitLive["level"]): UnitLive => ({
  level,
  containers: [],
  problems: [],
  crit: 0,
  high: 0,
  note: "",
});

describe("wallList", () => {
  it("puts red before amber and skips healthy units", () => {
    const live = new Map([
      ["a", lv("ok")],
      ["b", lv("warn")],
      ["c", lv("bad")],
    ]);
    expect(wallList(m, live)).toEqual(["c", "b"]);
  });
  it("tours the units you can open when all is well", () => {
    expect(wallList(m, new Map([["a", lv("ok")]]))).toEqual(["a"]);
  });
});
