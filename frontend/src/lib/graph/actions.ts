// Per-unit quick actions (ported from v0 `quick()`): open its links, its config in git,
// its Zabbix data, its last hour of logs, a copyable `docker logs` command. Pure.
import type { Node } from "./model";

const GIT = "https://git.clockmost.com/MarioGLealP/clockmost-infra/src/branch/main/projects";
const ZABBIX = "https://zabbix.clockmost.com/zabbix.php";
const LOGS = "https://logs.clockmost.com/web/logs";

export type Action =
  | { kind: "link"; title: string; url: string; primary?: boolean }
  | { kind: "copy"; title: string; text: string };

const link = (title: string, url: string, primary = false): Action => ({ kind: "link", title, url, primary });

export function actions(n: Node): Action[] {
  const out = (n.links ?? []).map((l, i) => link(`Open ${l.title}`, l.url, i === 0));
  if (n.project) out.push(link("Config in git", `${GIT}/${encodeURIComponent(n.project)}`));
  const cts = n.containers ?? [];
  if (n.zabbix_hostid) {
    const q = new URLSearchParams({ action: "latest.view", "hostids[]": n.zabbix_hostid, filter_set: "1" });
    if (cts[0]) q.set("name", cts[0]);
    out.push(link("Zabbix data", `${ZABBIX}?${q}`));
  }
  if (cts.length) {
    // OpenObserve takes the SQL filter base64-encoded; names come from the repo (no quotes in them)
    const query = btoa(cts.map((c) => `container_name='${c}'`).join(" OR "));
    const q = new URLSearchParams({ stream_type: "logs", stream: "docker", period: "1h", query });
    q.set("sql_mode", "false");
    q.set("org_identifier", "default");
    out.push(link("Logs (1h)", `${LOGS}?${q}`));
    const cmd = `docker logs -f --tail 100 ${cts[0]}`;
    out.push({ kind: "copy", title: `Copy: docker logs -f ${cts[0]}`, text: cmd });
  }
  return out;
}
