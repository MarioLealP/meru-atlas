// Per-unit live health from status.json (ported from the v0 atlas `nodeLive`). Pure.
import type { Node } from "../graph/model";
import type { Container, Problem, Status } from "../schemas";

export type Level = "" | "ok" | "warn" | "bad" | "off";
export type UnitLive = {
  level: Level;
  containers: [string, Container | undefined][];
  problems: Problem[];
  crit: number;
  high: number;
  note: string;
};

const TIMER: Record<string, string> = { trivy: "clockmost-trivy", exposure: "clockmost-exposure-check" };
const STALE_TIMER_S = 8 * 86400;

export function ago(t: number, now = Date.now() / 1000): string {
  const s = Math.max(0, Math.round(now - t));
  return s < 90
    ? `${s}s`
    : s < 5400
      ? `${Math.round(s / 60)}m`
      : s < 172800
        ? `${Math.round(s / 3600)}h`
        : `${Math.round(s / 86400)}d`;
}

const worse = (a: Level, b: Level): Level => {
  const rank: Level[] = ["", "ok", "off", "warn", "bad"];
  return rank.indexOf(b) > rank.indexOf(a) ? b : a;
};

export function unitLive(n: Node, d: Status, now = Date.now() / 1000): UnitLive {
  const r: UnitLive = { level: "", containers: [], problems: [], crit: 0, high: 0, note: "" };
  const cts = n.containers ?? [];
  for (const c of cts) {
    const st = d.containers[c];
    r.containers.push([c, st]);
    if (!st || st.state !== "running" || st.health === "unhealthy") r.level = "bad";
    else if (st.health === "starting") r.level = worse(r.level, "warn");
    const t = st?.image ? d.trivy?.[st.image] : undefined;
    if (t) {
      r.crit += t.c ?? 0;
      r.high += t.h ?? 0;
    }
  }
  const lab = n.label.toLowerCase();
  for (const p of d.problems) {
    const nm = p.name.toLowerCase();
    const mine = cts.length
      ? p.host === "clockmost" &&
        (cts.some((c) => nm.includes(c.toLowerCase())) || nm.startsWith(`${lab}:`) || nm.includes(` ${lab} `))
      : !!n.zabbix_hostid && p.hostid === n.zabbix_hostid;
    if (!mine) continue;
    r.problems.push(p);
    r.level = worse(r.level, p.severity >= 4 ? "bad" : p.severity >= 2 ? "warn" : "");
  }
  if (n.id === "canary" && d.bans?.length) {
    r.note = `${d.bans.length} banned`;
    r.level = worse(r.level, "warn");
  }
  if (n.id === "headscale" && d.headscale?.total)
    r.note = `${d.headscale.online ?? 0}/${d.headscale.total} online`;
  const tm = TIMER[n.id] && d.timers?.[TIMER[n.id]!];
  if (tm) {
    if (n.id === "trivy") {
      const c = Object.values(d.trivy ?? {}).reduce((s, v) => s + (v.c ?? 0), 0);
      r.note = `${c} crit · ${tm.at ? `${ago(tm.at, now)} ago` : "never"}`;
    } else r.note = tm.at ? `ran ${ago(tm.at, now)} ago` : "not run yet";
    if (!tm.at) r.level = "off";
    else if (tm.result && tm.result !== "success") r.level = "bad";
    else if (now - tm.at > STALE_TIMER_S) r.level = worse(r.level, "warn");
    else r.level = worse(r.level, "ok");
  }
  // stopped on purpose (overlay flag "off"): grey, never an alarm
  if (n.flag === "off" && r.containers.every(([, st]) => !st || st.state !== "running")) {
    r.level = "off";
    r.problems = [];
  }
  if (!r.level && (cts.length || n.zabbix_hostid)) r.level = "ok";
  return r;
}

export const isStale = (d: Status, now = Date.now() / 1000) => now - d.generated > 300;
