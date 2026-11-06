import pytest

from atlas_api.api.app import create_app
from atlas_api.config import Settings

ID = {"X-Authentik-Username": "akadmin"}


@pytest.fixture
def client(tmp_path, asgi_client):
    web = tmp_path / "web"
    (web / "assets").mkdir(parents=True)
    (web / "index.html").write_text("<!doctype html><title>atlas</title>")
    (web / "assets" / "index-AbC123.js").write_text("console.log(1)")
    (web / "assets" / "chakra-petch-latin-600-normal-x1.woff2").write_bytes(b"wOF2")
    (tmp_path / "secret.txt").write_text("outside dist")
    return asgi_client(create_app(Settings(web_dir=web)))


async def test_page_and_assets_need_the_sso_identity(client):
    assert (await client.get("/")).status_code == 403
    assert (await client.get("/assets/index-AbC123.js")).status_code == 403


async def test_index_is_never_cached_and_carries_the_csp(client):
    r = await client.get("/", headers=ID)
    assert r.status_code == 200
    assert "<title>atlas</title>" in r.text
    assert r.headers["cache-control"] == "no-cache"
    assert "script-src 'self'" in r.headers["content-security-policy"]


async def test_forms_may_only_post_to_janus_approve_and_go_on_to_authentik(client):
    header = (await client.get("/", headers=ID)).headers["content-security-policy"]
    csp = dict(d.strip().split(" ", 1) for d in header.split(";"))
    assert csp["form-action"].split() == [
        "https://atlas.clockmost.com/api/janus/approve/",
        "https://auth.clockmost.com/application/o/authorize/",
    ]


async def test_hashed_assets_are_immutable_with_the_right_type(client):
    js = await client.get("/assets/index-AbC123.js", headers=ID)
    assert js.status_code == 200
    assert "immutable" in js.headers["cache-control"]
    assert js.headers["content-type"].startswith("text/javascript")
    font = await client.get("/assets/chakra-petch-latin-600-normal-x1.woff2", headers=ID)
    assert font.headers["content-type"] == "font/woff2"


@pytest.mark.parametrize(
    "path",
    ["/assets/../secret.txt", "/assets/..%2Fsecret.txt", "/assets/%2e%2e%2fsecret.txt", "/assets/missing.js"],
)
async def test_nothing_outside_dist_assets(client, path):
    assert (await client.get(path, headers=ID)).status_code == 404


async def test_no_web_dir_means_api_only(tmp_path, asgi_client):
    c = asgi_client(create_app(Settings()))
    assert (await c.get("/", headers=ID)).status_code == 404
