"""Assemble docs.json (schema v1): every page validated, linked both ways, rendered.

Pure and deterministic (no dates computed here: staleness is judged by the reader against `verified`).
"""

from pathlib import Path
from typing import Any

from atlas_gen.docs.parse import Page, parse
from atlas_gen.docs.render import blocks

DOCS_DIR = "docs"
SKIP = {"README.md"}


def load(repo: Path) -> list[Page]:
    """Parse every page under docs/, sorted by path; none when the directory is missing."""
    root = repo / DOCS_DIR
    if not root.is_dir():
        return []
    return [parse(p, repo) for p in sorted(root.rglob("*.md")) if p.name not in SKIP]


def check(pages: list[Page], graph: dict[str, Any] | None = None) -> list[str]:
    """Every problem that should fail CI: bad pages, duplicate ids, links to nowhere."""
    errors = [e for p in pages for e in p.errors]
    seen: dict[str, str] = {}
    for p in pages:
        if p.id in seen:
            errors.append(f"{p.path}: page id `{p.id}` is also used by {seen[p.id]}")
        seen.setdefault(p.id, p.path)
    node_ids = {n["id"] for n in graph["nodes"]} if graph else None
    for p in pages:
        for kind, target in (p.fm.relations() if p.fm else []) + p.links:
            if target not in seen:
                errors.append(f"{p.path}: {kind} `{target}`, but there is no page with that id")
        if node_ids is not None and p.fm and p.fm.node and p.fm.node not in node_ids:
            errors.append(f"{p.path}: node `{p.fm.node}` is not on the atlas map")
    return errors


def node_of(p: Page, node_ids: set[str]) -> str | None:
    """The map node a page documents: its `node` field, else the node with the page's id."""
    if p.fm and p.fm.node:
        return p.fm.node
    return p.id if p.id in node_ids else None


def build_docs(pages: list[Page], graph: dict[str, Any] | None = None) -> dict[str, Any]:
    """The docs.json document for the pages with valid frontmatter."""
    good = [p for p in pages if p.fm]
    titles = {p.id: p.fm.title for p in good if p.fm}
    node_ids = {n["id"] for n in graph["nodes"]} if graph else set()
    rels = {p.id: [(k, t) for k, t in p.fm.relations() + p.links if t in titles] for p in good if p.fm}
    back: dict[str, list[dict[str, str]]] = {}
    for src, rs in rels.items():
        for kind, dst in rs:
            back.setdefault(dst, []).append({"kind": kind, "from": src})

    out = []
    for p in good:
        fm = p.fm
        assert fm is not None
        page: dict[str, Any] = {"id": p.id, "title": fm.title, "kind": fm.kind, "path": p.path}
        if node := node_of(p, node_ids):
            page["node"] = node
        page["status"] = fm.status
        page["verified"] = fm.verified.isoformat()
        if fm.installed_by:
            page["installed_by"] = fm.installed_by
        page["relations"] = [{"kind": k, "to": t} for k, t in rels[p.id]]
        page["backrefs"] = sorted(back.get(p.id, []), key=lambda b: (b["kind"], b["from"]))
        # folded into this page's view: what is part of it, and what runs on it (D4)
        page["children"] = sorted(q.id for q in good if q.fm and q.id != p.id and p.id in (q.fm.part_of, q.fm.runs_on))
        page["sections"] = [{"title": t, "blocks": blocks(b, titles)} for t, b in p.sections]
        out.append(page)

    covered = {pg["node"] for pg in out if "node" in pg}
    uncovered = sorted(n for n in node_ids if n not in covered)
    return {"schema_version": 1, "pages": out, "uncovered_nodes": uncovered}
