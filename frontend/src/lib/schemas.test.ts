// Keep the zod schema and the JSON Schema (schemas/graph.schema.json) in step: the real
// generated fixture must parse, and every top-level JSON Schema property must exist in zod.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Graph } from "./schemas";

const json = JSON.parse(readFileSync(new URL("../../../schemas/graph.schema.json", import.meta.url), "utf8"));
const fixture = JSON.parse(
  readFileSync(new URL("../../../packages/generator/tests/fixtures/graph.min.json", import.meta.url), "utf8"),
);

describe("graph contract", () => {
  it("parses the generator fixture", () => {
    expect(Graph.safeParse(fixture).success).toBe(true);
  });
  it("covers every top-level JSON Schema property", () => {
    const zodKeys = Object.keys(Graph.shape);
    for (const k of Object.keys(json.properties)) expect(zodKeys).toContain(k);
  });
});
