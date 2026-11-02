import json
from pathlib import Path
from urllib.parse import parse_qs

import httpx2
import pytest
from fastapi.testclient import TestClient

from atlas_api.main import create_app
from atlas_api.services.thoth import ASSERTION, Thoth
from atlas_api.settings import Settings

ID = {"X-Authentik-Username": "akadmin"}
APPS = [{"key": "kitsune", "status": "retained", "attributes": {}}, {"key": "echo", "status": "active"}]


def thoth(tmp_path: Path, handler) -> Thoth:
    token = tmp_path / "token"
    token.write_text("pod-token\n")
    http = httpx2.AsyncClient(transport=httpx2.MockTransport(handler))
    return Thoth(http, "http://thoth", "https://auth/token/", "thoth", token)


def client(tmp_path: Path, handler) -> TestClient:
    app = create_app(Settings(graph_file=tmp_path / "graph.json", status_file=tmp_path / "status.json"))
    app.state.thoth = thoth(tmp_path, handler)
    return TestClient(app)


def happy(calls: list):
    def handler(request: httpx2.Request) -> httpx2.Response:
        calls.append(request)
        if request.url.path == "/token/":
            return httpx2.Response(200, json={"access_token": "thoth-token", "expires_in": 600})
        return httpx2.Response(200, content=json.dumps(APPS))

    return handler


def test_logs_in_with_the_pod_token_and_lists_apps(tmp_path: Path) -> None:
    calls: list[httpx2.Request] = []
    c = client(tmp_path, happy(calls))
    r = c.get("/api/thoth/apps", headers=ID)
    assert r.status_code == 200
    assert r.json() == [{"key": "echo", "status": "active"}, {"key": "kitsune", "status": "retained"}]
    assert r.headers["cache-control"] == "no-store"
    login = parse_qs(calls[0].content.decode())
    assert login == {
        "grant_type": ["client_credentials"],
        "client_id": ["thoth"],
        "scope": ["thoth"],
        "client_assertion_type": [ASSERTION],
        "client_assertion": ["pod-token"],
    }  # no password: the pod's own Kubernetes token (D104)
    assert calls[1].headers["authorization"] == "Bearer thoth-token"
    assert dict(calls[1].url.params) == {"type": "app", "limit": "1000"}


def test_the_thoth_token_is_reused_until_it_runs_out(tmp_path: Path) -> None:
    calls: list[httpx2.Request] = []
    c = client(tmp_path, happy(calls))
    c.get("/api/thoth/apps", headers=ID)
    c.get("/api/thoth/apps", headers=ID)
    assert [r.url.path for r in calls] == ["/token/", "/v1/items", "/v1/items"]


@pytest.mark.parametrize("fail_at", ["/token/", "/v1/items"])
def test_a_failure_is_a_503_that_says_nothing_inside(tmp_path: Path, fail_at: str) -> None:
    def handler(request: httpx2.Request) -> httpx2.Response:
        if request.url.path == fail_at:
            return httpx2.Response(400, json={"error": "invalid_grant"})
        return happy([])(request)

    r = client(tmp_path, handler).get("/api/thoth/apps", headers=ID)
    assert (r.status_code, r.json()) == (503, {"detail": "Thoth unavailable"})


def test_needs_the_sso_identity_and_a_configured_thoth(tmp_path: Path) -> None:
    assert client(tmp_path, happy([])).get("/api/thoth/apps").status_code == 403
    app = create_app(Settings(graph_file=tmp_path / "g.json", status_file=tmp_path / "s.json"))
    assert TestClient(app).get("/api/thoth/apps", headers=ID).status_code == 503
