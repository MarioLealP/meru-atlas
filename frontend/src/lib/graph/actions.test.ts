import { describe, expect, it } from "vitest";
import { actions } from "./actions";

describe("actions", () => {
  it("covers links, git, zabbix, logs and the copy command for a container unit", () => {
    const a = actions({
      id: "gitea",
      label: "Gitea",
      zone: "apps",
      links: [{ title: "Gitea", url: "https://git.clockmost.com/" }],
      project: "gitea",
      containers: ["gitea-server"],
      zabbix_hostid: "10780",
    });
    expect(a.map((x) => x.title)).toEqual([
      "Open Gitea",
      "Config in git",
      "Zabbix data",
      "Logs (1h)",
      "Copy: docker logs -f gitea-server",
    ]);
    expect(a[0]).toMatchObject({ primary: true });
    const zbx = new URL((a[2] as { url: string }).url);
    expect(zbx.searchParams.get("hostids[]")).toBe("10780");
    expect(zbx.searchParams.get("name")).toBe("gitea-server");
    const logs = new URL((a[3] as { url: string }).url);
    expect(atob(logs.searchParams.get("query")!)).toBe("container_name='gitea-server'");
  });
  it("has nothing for a bare unit", () => {
    expect(actions({ id: "x", label: "X", zone: "z" })).toEqual([]);
  });
});
