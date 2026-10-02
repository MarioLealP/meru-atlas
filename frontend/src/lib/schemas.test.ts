// Keep the zod schemas and the JSON Schemas (schemas/*.schema.json) in step: the generator
// fixtures must parse, and every top-level JSON Schema property must exist in zod.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Graph, Status } from "./schemas";

const read = (p: string) => JSON.parse(readFileSync(new URL(`../../../${p}`, import.meta.url), "utf8"));
const FIX = "packages/generator/tests/fixtures";

describe.each([
  ["graph", Graph, read("schemas/graph.schema.json"), read(`${FIX}/graph.min.json`)],
  ["status", Status, read("schemas/status.schema.json"), read(`${FIX}/status.min.json`)],
] as const)("%s contract", (_, zod, json, fixture) => {
  it("parses the generator fixture", () => {
    expect(zod.safeParse(fixture).success).toBe(true);
  });
  it("covers every top-level JSON Schema property", () => {
    const zodKeys = Object.keys(zod.shape);
    for (const k of Object.keys(json.properties)) expect(zodKeys).toContain(k);
  });
});
