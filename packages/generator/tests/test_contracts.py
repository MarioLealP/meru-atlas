import copy
import json
from pathlib import Path

import pytest

from atlas_gen import contracts

FIX = Path(__file__).parent / "fixtures"


def load(name: str):
    return json.loads((FIX / name).read_text())


@pytest.mark.parametrize(("schema", "file"), [("graph", "graph.min.json"), ("status", "status.min.json")])
def test_fixture_is_valid(schema, file):
    assert contracts.errors(schema, load(file)) == []


def test_graph_rejects_unknown_edge_kind():
    g = load("graph.min.json")
    g["edges"][0]["kind"] = "teleport"
    assert any("edges/0/kind" in e for e in contracts.errors("graph", g))


def test_graph_rejects_layout_coordinates():
    # layout belongs to the frontend (ELK); x/y in the data means someone bypassed that
    g = copy.deepcopy(load("graph.min.json"))
    g["nodes"][0]["x"] = 10
    assert contracts.errors("graph", g)


def test_graph_rejects_unknown_top_level_keys():
    g = load("graph.min.json")
    g["secrets"] = {"token": "x"}
    assert contracts.errors("graph", g)


def test_unknown_schema_name():
    with pytest.raises(ValueError, match="unknown schema"):
        contracts.validator("nope")
