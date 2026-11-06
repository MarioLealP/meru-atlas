import json
from pathlib import Path

from atlas_gen.core import contracts
from atlas_gen.graph.build import build

REPO = Path(__file__).parents[1] / "fixtures" / "infra"


def graph():
    return build(REPO)


def by_id(g):
    return {n["id"]: n for n in g["nodes"]}


def test_graph_is_schema_valid():
    assert contracts.errors("graph", graph()) == []


def test_never_contains_secret_references():
    text = json.dumps(graph())
    assert "SUPER_SECRET" not in text
    assert "client_secret" not in text


def test_node_facts_from_repo():
    web = by_id(graph())["web"]
    assert web["containers"] == ["web", "web-worker-1"]
    assert web["version"] == "web 1.2 (env) · worker 3"
    assert web["public"] is True
    assert web["zabbix_hostid"] == "10780"
    assert {lk["url"] for lk in web["links"]} == {"https://web.clockmost.com/", "https://api.clockmost.com/"}
    assert ["URL", "web.clockmost.com · SSO gate · public (tunnel)"] in web["facts"]
    route = {"host": "web.clockmost.com", "login": "SSO gate", "sso": True, "public": True}
    assert route in web["routes"]


def test_unclaimed_container_and_route_go_to_unsorted():
    n = by_id(graph())
    assert n["u-db"]["zone"] == "unsorted"
    assert n["u-db"]["containers"] == ["lonely-db"]
    assert "u-192-168-10-9" in n  # IP route target, schema-safe id
    assert any(z["id"] == "unsorted" for z in graph()["zones"])


def test_generated_and_overlay_edges():
    edges = {(e["from"], e["to"], e["kind"]) for e in graph()["edges"]}
    assert ("caddy", "web", "route") in edges
    assert ("authentik", "web", "sso") in edges
    assert ("web", "caddy", "data") in edges


def test_warnings_for_missing_container_and_bad_edge():
    w = " ".join(graph()["warnings"])
    assert "not-there" in w
    assert "nowhere" in w
    assert "Unsorted" in w


def test_zones_order_and_strip():
    z = {x["id"]: x for x in graph()["zones"]}
    assert z["edge"]["order"] == 0
    assert z["plat"]["strip"] is True


def test_deterministic_without_commit():
    a, b = json.dumps(build(REPO)), json.dumps(build(REPO))
    assert a == b
    assert "source" not in build(REPO)
