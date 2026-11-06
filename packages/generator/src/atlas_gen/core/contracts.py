"""JSON Schema validation for the data files the atlas consumes."""

import json
from functools import cache
from importlib import resources
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator
from jsonschema.protocols import Validator

SCHEMAS = ("graph", "status", "docs")


def _schema_dir() -> Path:
    # schemas/ ships with the package (copied at build) or sits at the repo root (dev)
    packaged = resources.files("atlas_gen") / "schemas"
    if packaged.is_dir():
        return Path(str(packaged))
    return Path(__file__).resolve().parents[5] / "schemas"


@cache
def validator(name: str) -> Validator:
    """The checked validator for a schema in SCHEMAS, built once."""
    if name not in SCHEMAS:
        raise ValueError(f"unknown schema {name!r}")
    schema = json.loads((_schema_dir() / f"{name}.schema.json").read_text())
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema)


def errors(name: str, doc: Any) -> list[str]:
    """Human-readable validation errors ('' path = document root); empty when valid."""
    return [
        f"{'/'.join(str(p) for p in e.absolute_path) or '<root>'}: {e.message}"
        for e in sorted(validator(name).iter_errors(doc), key=lambda e: list(e.absolute_path))
    ]
