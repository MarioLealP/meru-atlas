"""projects/cloudflared/config.yml -> hostnames published through the tunnel."""

from pathlib import Path

from atlas_gen.parsers.yamlio import load_all


def parse(repo: Path) -> set[str]:
    doc = load_all(repo / "projects/cloudflared/config.yml")[0] or {}
    return {str(i["hostname"]) for i in doc.get("ingress", []) if i.get("hostname")}
