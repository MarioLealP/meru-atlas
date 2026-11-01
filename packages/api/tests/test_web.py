import pytest
from fastapi.testclient import TestClient

from atlas_api.main import create_app
from atlas_api.settings import Settings

ID = {"X-Authentik-Username": "akadmin"}


@pytest.fixture
def client(tmp_path):
    web = tmp_path / "web"
    (web / "assets").mkdir(parents=True)
    (web / "index.html").write_text("<!doctype html><title>atlas</title>")
    (web / "assets" / "index-AbC123.js").write_text("console.log(1)")
    (web / "assets" / "chakra-petch-latin-600-normal-x1.woff2").write_bytes(b"wOF2")
    (tmp_path / "secret.txt").write_text("outside dist")
    return TestClient(create_app(Settings(web_dir=web)))


def test_page_and_assets_need_the_sso_identity(client):
    assert client.get("/").status_code == 403
    assert client.get("/assets/index-AbC123.js").status_code == 403


def test_index_is_never_cached_and_carries_the_csp(client):
    r = client.get("/", headers=ID)
    assert r.status_code == 200 and "<title>atlas</title>" in r.text
    assert r.headers["cache-control"] == "no-cache"
    assert "script-src 'self'" in r.headers["content-security-policy"]


def test_forms_may_only_post_to_janus_approve_and_go_on_to_authentik(client):
    header = client.get("/", headers=ID).headers["content-security-policy"]
    csp = dict(d.strip().split(" ", 1) for d in header.split(";"))
    assert csp["form-action"].split() == [
        "https://atlas.clockmost.com/api/janus/approve/",
        "https://auth.clockmost.com/application/o/authorize/",
    ]


def test_hashed_assets_are_immutable_with_the_right_type(client):
    js = client.get("/assets/index-AbC123.js", headers=ID)
    assert js.status_code == 200 and "immutable" in js.headers["cache-control"]
    assert js.headers["content-type"].startswith("text/javascript")
    font = client.get("/assets/chakra-petch-latin-600-normal-x1.woff2", headers=ID)
    assert font.headers["content-type"] == "font/woff2"


@pytest.mark.parametrize(
    "path",
    ["/assets/../secret.txt", "/assets/..%2Fsecret.txt", "/assets/%2e%2e%2fsecret.txt", "/assets/missing.js"],
)
def test_nothing_outside_dist_assets(client, path):
    assert client.get(path, headers=ID).status_code == 404


def test_no_web_dir_means_api_only(tmp_path):
    c = TestClient(create_app(Settings()))
    assert c.get("/", headers=ID).status_code == 404
