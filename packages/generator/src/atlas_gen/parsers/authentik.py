"""projects/authentik/blueprints/*.yaml -> SSO apps by launch host (kind OIDC / SAML / forward-auth).

Blueprints reference secrets with !Env tags; those stay unresolved tag values and are never
read or emitted (only application name, slug and launch URL are used).
"""

import re
from pathlib import Path

from pydantic import BaseModel, ConfigDict

from atlas_gen.parsers.yamlio import load_all


class SsoApp(BaseModel):
    model_config = ConfigDict(frozen=True)

    host: str
    app: str
    kind: str  # "OIDC" | "SAML" | "forward-auth" | "?"


def _kind(models: set[str]) -> str:
    if any("saml" in m for m in models):
        return "SAML"
    if any("oauth2" in m for m in models):
        return "OIDC"
    if any("proxy" in m for m in models):
        return "forward-auth"
    return "?"


def parse(repo: Path) -> dict[str, SsoApp]:
    out: dict[str, SsoApp] = {}
    for path in sorted(repo.glob("projects/authentik/blueprints/*.yaml")):
        for doc in load_all(path, loose=True):
            entries = (doc or {}).get("entries") or []
            kind = _kind({str(e.get("model", "")) for e in entries})
            for e in entries:
                if e.get("model") != "authentik_core.application" or e.get("state") == "absent":
                    continue
                a = e.get("attrs") or {}
                m = re.match(r"https?://([^/:]+)", str(a.get("meta_launch_url") or ""))
                host = m.group(1) if m else f"{a.get('slug')}.clockmost.com"
                out[host] = SsoApp(host=host, app=str(a.get("name") or a.get("slug")), kind=kind)
    return out
