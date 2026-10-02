import json
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from atlas_api.main import create_app
from atlas_api.settings import Settings

FIX = Path(__file__).parents[2] / "generator" / "tests" / "fixtures"
ID = {"X-Authentik-Username": "akadmin"}


@pytest.fixture
def client(tmp_path):
    shutil.copy(FIX / "graph.min.json", tmp_path / "graph.json")
    shutil.copy(FIX / "status.min.json", tmp_path / "status.json")
    s = Settings(graph_file=tmp_path / "graph.json", status_file=tmp_path / "status.json")
    return TestClient(create_app(s)), tmp_path


def test_healthz_is_open(client):
    c, _ = client
    assert c.get("/healthz").status_code == 200


def test_data_requires_sso_identity(client):
    c, _ = client
    assert c.get("/api/graph").status_code == 403
    assert c.get("/api/graph", headers=ID).status_code == 200


def test_security_headers(client):
    c, _ = client
    r = c.get("/api/status", headers=ID)
    assert "default-src 'self'" in r.headers["content-security-policy"]
    assert r.headers["cache-control"] == "no-store"


def test_invalid_status_is_not_served(client):
    c, tmp = client
    (tmp / "status.json").write_text(json.dumps({"generated": "yesterday"}))
    r = c.get("/api/status", headers=ID)
    assert r.status_code == 503 and "schema violation" in r.json()["detail"]


def test_missing_file_is_503(client):
    c, tmp = client
    (tmp / "graph.json").unlink()
    assert c.get("/api/graph", headers=ID).status_code == 503


def test_no_api_docs_exposed(client):
    c, _ = client
    for p in ("/docs", "/redoc", "/openapi.json"):
        assert c.get(p, headers=ID).status_code == 404
