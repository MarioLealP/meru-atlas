import { describe, expect, it } from "vitest";
import { readHash } from "./hash";

describe("readHash", () => {
  it("reads a unit, a route and the catalogue", () => {
    expect(readHash("#u=gitea")).toEqual({ unit: "gitea", route: undefined, list: undefined });
    expect(readHash("#r=phone,gitea").route).toEqual(["phone", "gitea"]);
    expect(readHash("#v=list").list).toBe(true);
  });
  it("drops ids that don't match the id pattern", () => {
    expect(readHash("#u=<img src=x>").unit).toBeUndefined();
    expect(readHash("#r=a,b,c").route).toBeUndefined();
    expect(readHash("#r=a,B C").route).toBeUndefined();
  });
});
