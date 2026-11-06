"""Assemble graph.json (schema v1) from an infra checkout. Pure: no network, no secrets."""

import re
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict

from atlas_gen.graph import overlay as ov
from atlas_gen.graph.join import UNSORTED, Joined, join
from atlas_gen.graph.labels import login, version
from atlas_gen.parsers import authentik, caddy, cloudflared, compose
from atlas_gen.parsers.authentik import SsoApp
from atlas_gen.parsers.caddy import Route
from atlas_gen.parsers.compose import Container

OVERLAY_FIELDS = ("sub", "icon", "does", "about", "login_note")


class _Unit(BaseModel):
    """One overlay node with the repo facts that belong to it."""

    model_config = ConfigDict(frozen=True)

    n: dict[str, Any]
    own: list[Container]
    rts: list[Route]
    nets: list[str]
    ports: list[str]


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
    except OSError, StopIteration:
        return None
    return head if re.fullmatch(r"[0-9a-f]{7,40}", head) else None


def _unit(n: dict[str, Any], j: Joined, cts: dict[str, Container], routes: list[Route]) -> _Unit:
    own = [cts[c] for c in n.get("containers", []) if c in cts]
    return _Unit(
        n=n,
        own=own,
        rts=[r for r in routes if j.owner.get(r.target_host) == n["id"]],
        nets=sorted({x for c in own for x in c.networks}),
        ports=sorted({p for c in own for p in c.ports}),
    )


def _web(rts: list[Route], sso: dict[str, SsoApp], public: set[str]) -> list[dict[str, Any]]:
    out = []
    for r in rts:
        how = login(r, sso)
        out.append({"host": r.host, "login": how, "sso": how != "no SSO", "public": r.host in public})
    return out


def _facts(u: _Unit, web: list[dict[str, Any]], public: set[str]) -> list[list[str]]:
    facts = []
    if u.own:
        facts.append(["Runs", "; ".join(f"{c.name} ({c.image.split('@')[0]})" for c in u.own)])
    for w in web:
        facts.append(["URL", f"{w['host']} · {w['login']} · {'public (tunnel)' if w['public'] else 'LAN/VPN only'}"])
    if u.nets:
        facts.append(["Networks", ", ".join(u.nets)])
    if u.ports:
        facts.append(["Host ports", ", ".join(u.ports)])
    if u.n.get("show_public"):
        facts.append(["Public", ", ".join(sorted(public))])
    return facts


def _links(n: dict[str, Any], rts: list[Route]) -> list[dict[str, str]]:
    links = [{"title": str(t), "url": str(u)} for t, u in n.get("links", [])]
    seen = {re.sub(r"^https?://([^/]+).*", r"\1", lk["url"]) for lk in links}
    return links + [{"title": r.host.split(".")[0], "url": f"https://{r.host}/"} for r in rts if r.host not in seen]


def _described(n: dict[str, Any]) -> dict[str, Any]:
    """The part of a node that comes straight from the overlay."""
    node: dict[str, Any] = {"id": n["id"], "label": n["label"], "zone": n["zone"]}
    node |= {k: str(n[k]) for k in OVERLAY_FIELDS if n.get(k)}
    if "row" in n:
        node["rank"] = int(n["row"])
    if n.get("flag"):
        node["flag"] = n["flag"]
    return node


def _node(u: _Unit, web: list[dict[str, Any]], public: set[str], server_hostid: str) -> dict[str, Any]:
    """A graph node. The keys go in schema order: graph.json is compared byte for byte."""
    node = _described(u.n)
    if links := _links(u.n, u.rts):
        node["links"] = links
    if u.own:
        node |= {"containers": [c.name for c in u.own], "project": u.own[0].project}
    if v := version(u.own):
        node["version"] = v
    if u.ports:
        node["ports"] = u.ports
    if u.nets:
        node["networks"] = u.nets
    node["public"] = any(r.host in public for r in u.rts)
    if web:
        node["routes"] = web
    if hostid := str(u.n.get("zabbix_host") or (server_hostid if u.own else "")):
        node["zabbix_hostid"] = hostid
    if facts := _facts(u, web, public):
        node["facts"] = facts
    return node


def _route_edges(u: _Unit, sso: dict[str, SsoApp]) -> list[dict[str, str]]:
    node_id = u.n["id"]
    edges = []
    if u.rts and node_id != "caddy":
        edges.append({"from": "caddy", "to": node_id, "kind": "route"})
    if node_id != "authentik" and any(sso.get(r.host) and sso[r.host].kind in ("OIDC", "SAML") for r in u.rts):
        edges.append({"from": "authentik", "to": node_id, "kind": "sso"})
    return edges


def _overlay_edges(overlay_edges: list[list[str]], ids: set[str]) -> tuple[list[dict[str, str]], list[str]]:
    """The overlay's why-edges, and a warning for each one naming an unknown node."""
    edges, warnings = [], []
    for e in overlay_edges:
        if e[0] not in ids or e[1] not in ids:
            warnings.append(f"overlay edge {e[0]} → {e[1]} names an unknown node.")
            continue
        edges.append({"from": e[0], "to": e[1], "kind": e[2], **({"label": e[3]} if len(e) > 3 and e[3] else {})})
    return edges, warnings


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
        u = _unit(n, j, cts, routes)
        nodes.append(_node(u, _web(u.rts, sso, public), public, o.zabbix_server_hostid))
        edges += _route_edges(u, sso)
    overlay_edges, edge_warnings = _overlay_edges(o.edges, {n["id"] for n in nodes})
    edges += overlay_edges

    zones = list(o.zones)
    if any(n["zone"] == UNSORTED for n in nodes):
        zones.append({"id": UNSORTED, "title": "Unsorted · needs overlay", "order": len(zones)})
    graph: dict[str, Any] = {
        "schema_version": 1,
        "router_forwards": o.router_forwards,
        "zones": zones,
        "nodes": nodes,
        "edges": edges,
        "warnings": j.warnings + edge_warnings,
    }
    if with_commit and (sha := _commit(repo)):
        graph["source"] = {"repo": "MarioGLealP/clockmost-infra", "commit": sha}
    return graph
