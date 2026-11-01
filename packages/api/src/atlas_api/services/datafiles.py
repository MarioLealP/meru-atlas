"""Read graph.json / status.json / docs.json from their read-only mounts, validated, cached by mtime.
A path ending in .gz is read gzipped (Meru sends docs.json that way: Kubernetes objects stop at 1 MiB)."""

import gzip
import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict

from atlas_gen import contracts


class DataUnavailable(RuntimeError):
    """The file is missing or doesn't match its schema (never serve unvalidated data)."""


class _Entry(BaseModel):
    model_config = ConfigDict(frozen=True)

    mtime_ns: int
    doc: Any


class DataFile:
    def __init__(self, path: Path, schema: str):
        self.path, self.schema = path, schema
        self._cache: _Entry | None = None

    def mtime_ns(self) -> int:
        try:
            return self.path.stat().st_mtime_ns
        except FileNotFoundError:
            return 0

    def load(self) -> Any:
        m = self.mtime_ns()
        if not m:
            raise DataUnavailable(f"{self.schema}: file missing")
        if self._cache and self._cache.mtime_ns == m:
            return self._cache.doc
        try:
            raw = self.path.read_bytes()
            doc = json.loads(gzip.decompress(raw) if self.path.suffix == ".gz" else raw)
        except (OSError, ValueError) as e:
            raise DataUnavailable(f"{self.schema}: unreadable ({type(e).__name__})") from e
        if errs := contracts.errors(self.schema, doc):
            raise DataUnavailable(f"{self.schema}: schema violation: {errs[0]}")
        self._cache = _Entry(mtime_ns=m, doc=doc)
        return doc
