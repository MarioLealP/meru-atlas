import gzip
import json
import shutil
from pathlib import Path

import pytest

from atlas_api.api.app import create_app
from atlas_api.config import Settings

FIX = Path(__file__).parents[3] / "generator" / "tests" / "fixtures"
ID = {"X-Authentik-Username": "akadmin"}


@pytest.fixture
def client(tmp_path, asgi_client):
    shutil.copy(FIX / "graph.min.json", tmp_path / "graph.json")
    shutil.copy(FIX / "status.min.json", tmp_path / "status.json")
    s = Settings(graph_file=tmp_path / "graph.json", status_file=tmp_path / "status.json")
    return asgi_client(create_app(s)), tmp_path


async def test_healthz_is_open(client):
    c, _ = client
    assert (await c.get("/healthz")).status_code == 200


async def test_data_requires_sso_identity(client):
    c, _ = client
    assert (await c.get("/api/graph")).status_code == 403
    assert (await c.get("/api/graph", headers=ID)).status_code == 200


async def test_security_headers(client):
    c, _ = client
    r = await c.get("/api/status", headers=ID)
    assert "default-src 'self'" in r.headers["content-security-policy"]
    assert r.headers["cache-control"] == "no-store"


async def test_invalid_status_is_not_served(client):
    c, tmp = client
    (tmp / "status.json").write_text(json.dumps({"generated": "yesterday"}))
    r = await c.get("/api/status", headers=ID)
    assert r.status_code == 503
    assert "schema violation" in r.json()["detail"]


async def test_missing_file_is_503(client):
    c, tmp = client
    (tmp / "graph.json").unlink()
    assert (await c.get("/api/graph", headers=ID)).status_code == 503


async def test_no_api_docs_exposed(client):
    c, _ = client
    for p in ("/docs", "/redoc", "/openapi.json"):
        assert (await c.get(p, headers=ID)).status_code == 404


async def test_docs_served_validated_and_503_when_absent(client):
    c, tmp = client
    assert (await c.get("/api/docs", headers=ID)).status_code == 503  # no docs.json yet: the map still works
    (tmp / "docs.json").write_text(json.dumps({"schema_version": 1, "pages": [], "uncovered_nodes": []}))
    assert (await c.get("/api/docs")).status_code == 403
    r = await c.get("/api/docs", headers=ID)
    assert r.status_code == 200
    assert r.json()["pages"] == []
    (tmp / "docs.json").write_text(json.dumps({"schema_version": 1, "pages": [{"id": "x"}]}))
    assert (await c.get("/api/docs", headers=ID)).status_code == 503


async def test_gzipped_docs_are_read_as_meru_mounts_them(tmp_path, asgi_client):
    """On Meru docs.json arrives gzipped in a ConfigMap (1 MiB object limit): a .gz path is decompressed."""
    shutil.copy(FIX / "graph.min.json", tmp_path / "graph.json")
    docs = {"schema_version": 1, "pages": [], "uncovered_nodes": []}
    (tmp_path / "docs.json.gz").write_bytes(gzip.compress(json.dumps(docs).encode()))
    s = Settings(graph_file=tmp_path / "graph.json", docs_file=tmp_path / "docs.json.gz")
    r = await asgi_client(create_app(s)).get("/api/docs", headers=ID)
    assert r.status_code == 200
    assert r.json()["pages"] == []
    (tmp_path / "docs.json.gz").write_bytes(b"not gzip")
    assert (await asgi_client(create_app(s)).get("/api/docs", headers=ID)).status_code == 503
