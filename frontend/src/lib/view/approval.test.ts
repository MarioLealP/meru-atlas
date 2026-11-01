import { describe as group, expect, it } from "vitest";
import { describe, readOutcome } from "./approval";

group("readOutcome", () => {
  it("reads what Janus sends back", () => {
    expect(readOutcome("#v=requests&res=done&pr=7&dec=approve&by=akadmin&c=c0ffee1")).toEqual({
      result: "done",
      pr: 7,
      decision: "approve",
      by: "akadmin",
      commit: "c0ffee1",
    });
  });
  it("has nothing to say without a known result", () => {
    expect(readOutcome("#v=requests")).toBeNull();
    expect(readOutcome("#v=requests&res=hacked")).toBeNull();
  });
  it("drops fields that don't check out", () => {
    expect(readOutcome("#res=done&pr=-1&dec=merge&by=%3Cb%3E&c=nothex")).toEqual({
      result: "done",
      pr: undefined,
      decision: undefined,
      by: undefined,
      commit: undefined,
    });
  });
});

group("describe", () => {
  it("words each ending from the atlas's own text", () => {
    expect(describe({ result: "done", pr: 10, decision: "deny", by: "akadmin" })).toEqual({
      tone: "ok",
      title: "#10 denied",
      text: "Denied by akadmin - the PR is closed.",
    });
    const approved = describe({
      result: "done",
      pr: 7,
      decision: "approve",
      by: "akadmin",
      commit: "a".repeat(40),
    });
    expect(approved.text).toBe(
      "Approved by akadmin - on Meru/requests main in aaaaaaaaaaaa. Shikigami builds it next.",
    );
    expect(describe({ result: "done", pr: 13, decision: "remove", by: "akadmin" }).title).toBe(
      "#13 removal approved",
    );
    expect(readOutcome("#res=already-removed&dec=remove")).toMatchObject({
      result: "already-removed",
      decision: "remove",
    });
    const changed = describe({ result: "changed", pr: 7, decision: "approve" });
    expect(changed).toMatchObject({ tone: "crit", title: "Approve on #7 didn't go through" });
  });
});
