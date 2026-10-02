"""Join repo facts with the overlay: who owns which container/route, unsorted units, warnings."""

from dataclasses import dataclass, field
from typing import Any

from atlas_gen.labels import safe_id
from atlas_gen.parsers.caddy import Route
from atlas_gen.parsers.compose import Container

UNSORTED = "unsorted"


@dataclass
class Joined:
    nodes: list[dict[str, Any]]
    owner: dict[str, str]  # container name / service alias / route target host -> node id
    warnings: list[str] = field(default_factory=list)


def join(overlay_nodes: list[dict[str, Any]], cts: dict[str, Container], routes: list[Route]) -> Joined:
    nodes = [dict(n) for n in overlay_nodes]
    owner: dict[str, str] = {}
    warnings: list[str] = []
    for n in nodes:
        for key in (*n.get("containers", []), *n.get("targets", [])):
            owner[key] = n["id"]
    for c, nid in list(owner.items()):  # Caddy may target a compose service name (network alias)
        if c in cts:
            owner.setdefault(cts[c].service, nid)
    for n in nodes:
        if missing := [c for c in n.get("containers", []) if c not in cts]:
            warnings.append(
                f"{n['label']}: overlay lists {', '.join(missing)}, but no compose file declares it "
                "(running outside the repo, or gone)."
            )

    by_proj: dict[str, list[str]] = {}
    for c in sorted(c for c in cts if c not in owner):
        by_proj.setdefault(cts[c].project, []).append(c)
    for proj, names in sorted(by_proj.items()):
        nid = "u-" + safe_id(proj)
        nodes.append(_unsorted(nid, proj, "needs an overlay entry", containers=names))
        owner.update({c: nid for c in names})
    for r in routes:
        if r.target_host not in owner:
            nid = "u-" + safe_id(r.target_host)
            nodes.append(_unsorted(nid, r.host.split(".")[0], f"route → {r.target}", targets=[r.target_host]))
            owner[r.target_host] = nid
    if names := sorted({n["label"] for n in nodes if n["zone"] == UNSORTED}):
        warnings.append(f"Unsorted: {', '.join(names)}. Add them to atlas/overlay.yaml.")
    return Joined(nodes, owner, warnings)


def _unsorted(nid: str, label: str, sub: str, **claims: list[str]) -> dict[str, Any]:
    about = "In the repo but not described in atlas/overlay.yaml yet."
    return {"id": nid, "label": label, "sub": sub, "zone": UNSORTED, "flag": "warn", "about": about, **claims}
