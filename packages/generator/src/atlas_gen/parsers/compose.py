"""projects/*/compose.yaml -> containers (name -> project, service, image, networks, ports, mem)."""

from dataclasses import dataclass, field
from pathlib import Path

from atlas_gen.parsers.yamlio import load_all


@dataclass(frozen=True)
class Container:
    name: str
    project: str
    service: str
    image: str
    networks: tuple[str, ...]
    ports: tuple[str, ...] = field(default=())
    mem: str = ""


def _network_name(key: str, defs: dict, project: str) -> str:
    d = defs.get(key) or {}
    if d.get("name"):
        return str(d["name"])
    return key if d.get("external") else f"{project}_{key}"


def parse(repo: Path) -> dict[str, Container]:
    out: dict[str, Container] = {}
    for path in sorted(repo.glob("projects/*/compose.yaml")):
        proj_dir = path.parent.name
        doc = (load_all(path) or [{}])[0] or {}
        proj = doc.get("name") or proj_dir
        defs = doc.get("networks") or {}
        for svc, s in (doc.get("services") or {}).items():
            s = s or {}
            if s.get("network_mode"):
                nets = [str(s["network_mode"])]
            elif s.get("networks") is None:
                nets = [f"{proj}_default"]
            else:
                nets = [_network_name(k, defs, proj) for k in s["networks"]]
            name = s.get("container_name") or f"{proj}-{svc}-1"
            out[name] = Container(
                name=name,
                project=proj_dir,
                service=svc,
                image=str(s.get("image") or "(built)"),
                networks=tuple(sorted(nets)),
                ports=tuple(str(p) for p in (s.get("ports") or [])),
                mem=str(s.get("mem_limit") or ""),
            )
    return out
