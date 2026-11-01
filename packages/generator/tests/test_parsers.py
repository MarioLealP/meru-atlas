from pathlib import Path

from atlas_gen.parsers import authentik, caddy, cloudflared, compose

REPO = Path(__file__).parent / "fixtures" / "infra"


def test_compose_networks_and_default_names():
    cts = compose.parse(REPO)
    assert cts["web"].networks == ("front-web", "web_internal")
    assert cts["web-worker-1"].networks == ("web_default",)  # no container_name, no networks
    assert cts["caddy"].ports == ("443:443",)


def test_caddy_routes_gates_and_comments():
    r = {x.host: x for x in caddy.parse(REPO)}
    assert set(r) == {"web.clockmost.com", "api.clockmost.com", "ghost.clockmost.com"}
    assert r["web.clockmost.com"].gate == "sso"
    assert r["api.clockmost.com"].gate == "sso-partial"  # nested open handle = API bypass
    assert r["ghost.clockmost.com"].target_host == "192.168.10.9"


def test_cloudflared_public_hosts():
    assert cloudflared.parse(REPO) == {"web.clockmost.com"}


def test_authentik_apps_skip_absent_and_ignore_secrets():
    apps = authentik.parse(REPO)
    assert set(apps) == {"web.clockmost.com"}
    assert apps["web.clockmost.com"].kind == "OIDC"
