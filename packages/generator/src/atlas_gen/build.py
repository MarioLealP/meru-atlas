"""Assemble graph.json (schema v1) from an infra checkout. Pure: no network, no secrets."""

import re
from pathlib import Path
from typing import Any

from atlas_gen import overlay as ov
from atlas_gen.join import UNSORTED, join
from atlas_gen.labels import login, version
from atlas_gen.parsers import authentik, caddy, cloudflared, compose

OVERLAY_FIELDS = ("sub", "icon", "does", "about", "login_note")


def _commit(repo: Path) -> str | None:
    """HEAD commit, read from .git directly (no git binary or subprocess needed)."""
    git = repo / ".git"
    try:
        head = (git / "HEAD").read_text().strip()
        if head.startswith("ref: "):
            ref = head[5:]
            loose = git / ref
            if loose.exists():
                head = loose.read_text().strip()
            else:
                packed = (git / "packed-refs").read_text().splitlines()
                head = next(line.split()[0] for line in packed if line.endswith(" " + ref))
    except (OSError, StopIteration):
        return None
    return head if re.fullmatch(r"[0-9a-f]{7,40}", head) else None


def build(repo: Path, overlay_path: Path | None = None, with_commit: bool = False) -> dict[str, Any]:
    """Deterministic by default (same repo content -> same bytes), so CI only commits real changes."""
    cts = compose.parse(repo)
    routes = caddy.parse(repo)
    public = cloudflared.parse(repo)
    sso = authentik.parse(repo)
    o = ov.load(overlay_path or repo / "atlas/overlay.yaml")
    j = join(o.nodes, cts, routes)

    nodes, edges = [], []
    for n in j.nodes:
        own = [cts[c] for c in n.get("containers", []) if c in cts]
        rts = [r for r in routes if j.owner.get(r.target_host) == n["id"]]
        nets = sorted({x for c in own for x in c.networks})
        ports = sorted({p for c in own for p in c.ports})
        facts = []
        if own:
            facts.append(["Runs", "; ".join(f"{c.name} ({c.image.split('@')[0]})" for c in own)])
        for r in rts:
            reach = "public (tunnel)" if r.host in public else "LAN/VPN only"
            facts.append(["URL", f"{r.host} · {login(r, sso)} · {reach}"])
        if nets:
            facts.append(["Networks", ", ".join(nets)])
        if ports:
            facts.append(["Host ports", ", ".join(ports)])
        if n.get("show_public"):
            facts.append(["Public", ", ".join(sorted(public))])

        links = [{"title": str(t), "url": str(u)} for t, u in n.get("links", [])]
        seen = {re.sub(r"^https?://([^/]+).*", r"\1", lk["url"]) for lk in links}
        links += [
            {"title": r.host.split(".")[0], "url": f"https://{r.host}/"} for r in rts if r.host not in seen
        ]

        node: dict[str, Any] = {"id": n["id"], "label": n["label"], "zone": n["zone"]}
        node |= {k: str(n[k]) for k in OVERLAY_FIELDS if n.get(k)}
        if "row" in n:
            node["rank"] = int(n["row"])
        if n.get("flag"):
            node["flag"] = n["flag"]
        if links:
            node["links"] = links
        if own:
            node |= {"containers": [c.name for c in own], "project": own[0].project}
        if v := version(own):
            node["version"] = v
        if ports:
            node["ports"] = ports
        if nets:
            node["networks"] = nets
        node["public"] = any(r.host in public for r in rts)
        if hostid := str(n.get("zabbix_host") or (o.zabbix_server_hostid if own else "")):
            node["zabbix_hostid"] = hostid
        if facts:
            node["facts"] = facts
        nodes.append(node)

        if rts and n["id"] != "caddy":
            edges.append({"from": "caddy", "to": n["id"], "kind": "route"})
        if n["id"] != "authentik" and any(
            sso.get(r.host) and sso[r.host].kind in ("OIDC", "SAML") for r in rts
        ):
            edges.append({"from": "authentik", "to": n["id"], "kind": "sso"})

    ids = {n["id"] for n in nodes}
    for e in o.edges:
        if e[0] not in ids or e[1] not in ids:
            j.warnings.append(f"overlay edge {e[0]} → {e[1]} names an unknown node.")
            continue
        edges.append(
            {"from": e[0], "to": e[1], "kind": e[2], **({"label": e[3]} if len(e) > 3 and e[3] else {})}
        )

    zones = list(o.zones)
    if any(n["zone"] == UNSORTED for n in nodes):
        zones.append({"id": UNSORTED, "title": "Unsorted · needs overlay", "order": len(zones)})
    graph: dict[str, Any] = {
        "schema_version": 1,
        "router_forwards": o.router_forwards,
        "zones": zones,
        "nodes": nodes,
        "edges": edges,
        "warnings": j.warnings,
    }
    if with_commit and (sha := _commit(repo)):
        graph["source"] = {"repo": "Benylin/clockmost-infra", "commit": sha}
    return graph
