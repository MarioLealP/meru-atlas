import { describe, expect, it } from "vitest";
import { statusByApp, toneOf } from "./thoth";

describe("toneOf", () => {
  it("colours what needs a look", () => {
    expect(toneOf("active")).toBe("ok");
    expect(toneOf("planned")).toBe("warn");
    expect(toneOf("missing")).toBe("crit");
    expect(toneOf("retained")).toBe("quiet");
    expect(toneOf("stopped")).toBe("quiet");
  });
  it("keeps a status it doesn't know quiet", () => {
    expect(toneOf("hibernating")).toBe("quiet");
  });
});

describe("statusByApp", () => {
  it("looks apps up by name, and is empty without Thoth", () => {
    expect(statusByApp([{ key: "echo", status: "active" }]).get("echo")).toBe("active");
    expect(statusByApp(null).size).toBe(0);
  });
});
