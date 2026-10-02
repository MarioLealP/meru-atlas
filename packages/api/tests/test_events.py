import os
import shutil
import threading
import time
from pathlib import Path

from fastapi.testclient import TestClient

from atlas_api.main import create_app
from atlas_api.settings import Settings

FIX = Path(__file__).parents[2] / "generator" / "tests" / "fixtures"
ID = {"X-Authentik-Username": "akadmin"}


def make(tmp_path, max_s=0.6):
    shutil.copy(FIX / "graph.min.json", tmp_path / "graph.json")
    shutil.copy(FIX / "status.min.json", tmp_path / "status.json")
    s = Settings(
        graph_file=tmp_path / "graph.json",
        status_file=tmp_path / "status.json",
        events_poll_s=0.05,
        events_keepalive_s=0.2,
        events_max_s=max_s,
    )
    return TestClient(create_app(s))


def test_events_need_the_sso_identity(tmp_path):
    assert make(tmp_path).get("/api/events").status_code == 403


def test_a_status_write_becomes_a_named_event_without_data(tmp_path):
    c = make(tmp_path)

    def touch():
        time.sleep(0.15)
        st = tmp_path / "status.json"
        os.utime(st, ns=(st.stat().st_atime_ns, st.stat().st_mtime_ns + 1_000_000))

    threading.Thread(target=touch).start()
    r = c.get("/api/events", headers=ID)  # the stream ends after events_max_s
    assert r.headers["content-type"].startswith("text/event-stream")
    assert r.text.startswith("retry: 5000")
    assert "event: status\ndata: {}\n\n" in r.text
    assert "event: graph" not in r.text
    assert ": keep-alive" in r.text
    assert "SUPER_SECRET" not in r.text and "schema_version" not in r.text  # names only
