"""projects/caddy/Caddyfile -> web routes (host, target, SSO gate)."""

import re
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Route:
    host: str
    matcher: str
    target: str  # "name:port", "ip:port" or "static files"
    gate: str  # "sso", "sso-partial" (nested bypass, e.g. OctoPrint's API) or ""

    @property
    def target_host(self) -> str:
        return self.target if self.target == "static files" else self.target.split(":")[0]


def _blocks(text: str) -> Iterator[tuple[str, str]]:
    """(matcher name, body) for every `handle @name { ... }`, brace-balanced."""
    for m in re.finditer(r"^\s*handle @([\w-]+)\s*\{", text, re.M):
        depth, i = 1, m.end()
        while depth and i < len(text):
            depth += {"{": 1, "}": -1}.get(text[i], 0)
            i += 1
        yield m.group(1), text[m.end() : i - 1]


def parse(repo: Path) -> list[Route]:
    raw = (repo / "projects/caddy/Caddyfile").read_text(encoding="utf-8-sig")
    text = "\n".join(line for line in raw.splitlines() if not line.lstrip().startswith("#"))
    hosts = {m.group(1): m.group(2).split() for m in re.finditer(r"^\s*@([\w-]+)\s+host\s+(.+)$", text, re.M)}
    routes: list[Route] = []
    for name, body in _blocks(text):
        if name not in hosts:
            continue
        tgt = re.search(r"reverse_proxy\s+(?!/)(\S+)", body)
        target = tgt.group(1) if tgt else ("static files" if "file_server" in body else "?")
        gated = "import authentik_forward" in body
        partial = gated and bool(re.search(r"handle @[\w-]+\s*\{\s*reverse_proxy", body))
        gate = "sso-partial" if partial else ("sso" if gated else "")
        routes += [Route(h, name, target, gate) for h in hosts[name]]
    return routes
