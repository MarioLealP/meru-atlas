"""atlas/overlay.yaml: the hand-written half (zones, descriptions, why-edges, forwards)."""

from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from atlas_gen.parsers.yamlio import load_all

STRIP_ZONES = {"plat"}  # full-width strip below the columns


class Overlay(BaseModel):
    """overlay.yaml with its short list forms expanded."""

    model_config = ConfigDict(frozen=True)

    zones: list[dict[str, Any]]
    nodes: list[dict[str, Any]]
    edges: list[list[str]]
    router_forwards: list[dict[str, Any]] = Field(default_factory=list)
    zabbix_server_hostid: str = ""


def load(path: Path) -> Overlay:
    """Read the overlay file; missing sections come back empty."""
    d = load_all(path)[0] or {}
    zones = [
        {"id": z[0], "title": z[1], "order": i, **({"strip": True} if z[0] in STRIP_ZONES else {})}
        for i, z in enumerate(d.get("zones") or [])
    ]
    fwd = [{"proto": f[0], "port": int(f[1]), "target": str(f[2])} for f in d.get("router_forwards") or []]
    return Overlay(
        zones=zones,
        nodes=[dict(n) for n in d.get("nodes") or []],
        edges=[list(map(str, e)) for e in d.get("edges") or []],
        router_forwards=fwd,
        zabbix_server_hostid=str(d.get("zabbix_server_hostid") or ""),
    )
