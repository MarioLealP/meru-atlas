"""Small, pure text helpers shared by the join (versions, login labels, ids)."""

import re

from atlas_gen.parsers.authentik import SsoApp
from atlas_gen.parsers.caddy import Route
from atlas_gen.parsers.compose import Container


def version(cts: list[Container]) -> str:
    """Pinned image versions, e.g. 'gitea 1.27.3 · postgres 17'; digests dropped, built images skipped."""
    seen: list[str] = []
    for c in cts:
        img = re.sub(
            r"\$\{\w+:-([^}]*)\}", r"\1 (env)", c.image.split("@")[0]
        )  # ${VAR:-x}: real value in .env
        last = img.split("/")[-1]
        if ":" not in last:
            continue
        name, tag = last.split(":", 1)
        if f"{name} {tag}" not in seen:
            seen.append(f"{name} {tag}")
    return " · ".join(seen)


def login(route: Route, sso: dict[str, SsoApp]) -> str:
    if route.target.startswith("authentik-server"):
        return "is the SSO"
    if route.gate == "sso-partial":
        return "SSO gate (API bypass)"
    if route.gate == "sso":
        return "SSO gate"
    kind = sso[route.host].kind if route.host in sso else ""
    return f"SSO ({kind})" if kind in ("OIDC", "SAML") else "no SSO"


def safe_id(raw: str) -> str:
    """Schema-safe node id ([a-z0-9-]) for generated units (e.g. an IP route target)."""
    return re.sub(r"[^a-z0-9-]+", "-", raw.lower()).strip("-") or "unit"
