"""Read graph.json / status.json / docs.json from their read-only mounts, validated, cached by mtime.

A path ending in .gz is read gzipped (Meru sends docs.json that way: Kubernetes objects stop at 1 MiB).
"""

import gzip
import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, PrivateAttr

from atlas_gen.core import contracts


class DataUnavailableError(RuntimeError):
    """The file is missing or doesn't match its schema (never serve unvalidated data)."""


class _Entry(BaseModel):
    model_config = ConfigDict(frozen=True)

    mtime_ns: int
    doc: Any


class DataFile(BaseModel):
    """One mounted JSON file, checked against its schema."""

    model_config = ConfigDict(frozen=True)

    path: Path
    schema_name: str
    _cache: _Entry | None = PrivateAttr(default=None)

    def mtime_ns(self) -> int:
        """The file's modification time in nanoseconds, 0 when it is missing."""
        try:
            return self.path.stat().st_mtime_ns
        except FileNotFoundError:
            return 0

    def load(self) -> Any:
        """The parsed document, re-read only when the file changed.

        Raises:
            DataUnavailableError: the file is missing, unreadable or fails its schema.
        """
        m = self.mtime_ns()
        if not m:
            raise DataUnavailableError(f"{self.schema_name}: file missing")
        if self._cache and self._cache.mtime_ns == m:
            return self._cache.doc
        try:
            raw = self.path.read_bytes()
            doc = json.loads(gzip.decompress(raw) if self.path.suffix == ".gz" else raw)
        except (OSError, ValueError) as e:
            raise DataUnavailableError(f"{self.schema_name}: unreadable ({type(e).__name__})") from e
        if errs := contracts.errors(self.schema_name, doc):
            raise DataUnavailableError(f"{self.schema_name}: schema violation: {errs[0]}")
        self._cache = _Entry(mtime_ns=m, doc=doc)
        return doc
