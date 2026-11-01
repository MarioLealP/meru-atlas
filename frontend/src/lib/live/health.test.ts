import { describe, expect, it } from "vitest";
import type { Node } from "../graph/model";
import type { Status } from "../schemas";
import { ago, unitLive } from "./health";

const NOW = 2_000_000_000;
const base: Status = { generated: NOW, containers: {}, problems: [], errors: [] };
const node = (o: Partial<Node>): Node => ({ id: "x", label: "X", zone: "z", ...o });

describe("unitLive", () => {
  it("is ok when all containers run, and sums trivy by image", () => {
    const d = {
      ...base,
      containers: { a: { state: "running", image: "img:1" } },
      trivy: { "img:1": { c: 2, h: 5 } },
    };
    const r = unitLive(node({ containers: ["a"] }), d, NOW);
    expect(r).toMatchObject({ level: "ok", crit: 2, high: 5 });
  });
  it("is bad when a container is missing or unhealthy", () => {
    expect(unitLive(node({ containers: ["gone"] }), base, NOW).level).toBe("bad");
    const d = { ...base, containers: { a: { state: "running", health: "unhealthy" } } };
    expect(unitLive(node({ containers: ["a"] }), d, NOW).level).toBe("bad");
  });
  it("matches zabbix problems by hostid for container-less units", () => {
    const d = { ...base, problems: [{ name: "disk", severity: 3, since: NOW, hostid: "7" }] };
    const r = unitLive(node({ zabbix_hostid: "7" }), d, NOW);
    expect(r.level).toBe("warn");
    expect(r.problems).toHaveLength(1);
    expect(unitLive(node({ zabbix_hostid: "8" }), d, NOW).problems).toHaveLength(0);
  });
  it("greys out units stopped on purpose", () => {
    expect(unitLive(node({ containers: ["p"], flag: "off" }), base, NOW).level).toBe("off");
  });
  it("flags failed or stale host timers", () => {
    const fail = { ...base, timers: { "clockmost-exposure-check": { result: "failed", at: NOW - 60 } } };
    expect(unitLive(node({ id: "exposure" }), fail, NOW).level).toBe("bad");
    const old = {
      ...base,
      timers: { "clockmost-exposure-check": { result: "success", at: NOW - 9 * 86400 } },
    };
    expect(unitLive(node({ id: "exposure" }), old, NOW).level).toBe("warn");
  });
  it("has no level for units nothing reports on", () => {
    expect(unitLive(node({}), base, NOW).level).toBe("");
  });
});

describe("ago", () => {
  it("formats", () => {
    expect(ago(NOW - 30, NOW)).toBe("30s");
    expect(ago(NOW - 600, NOW)).toBe("10m");
    expect(ago(NOW - 7200, NOW)).toBe("2h");
    expect(ago(NOW - 3 * 86400, NOW)).toBe("3d");
  });
});
