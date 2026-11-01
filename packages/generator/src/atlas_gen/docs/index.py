"""docs.sqlite: the pages joined with the map's repo facts, for the agent to query with SQL.

Tables: pages, sections (+ sections_fts full text), relations (both frontmatter and [[links]]),
nodes, containers, routes. Rebuilt from scratch each time; never committed."""

import json
import sqlite3
from pathlib import Path
from typing import Any

from atlas_gen.docs.build import node_of
from atlas_gen.docs.parse import Page

SCHEMA = """
CREATE TABLE pages (id TEXT PRIMARY KEY, title TEXT, kind TEXT, status TEXT, installed_by TEXT,
  verified TEXT, runs_on TEXT, part_of TEXT, node TEXT, path TEXT, errors TEXT);
CREATE TABLE sections (page TEXT, idx INTEGER, title TEXT, markdown TEXT);
CREATE VIRTUAL TABLE sections_fts USING fts5(page, title, markdown);
CREATE TABLE relations (src TEXT, kind TEXT, dst TEXT, dst_exists INTEGER);
CREATE TABLE nodes (id TEXT PRIMARY KEY, label TEXT, zone TEXT, project TEXT, public INTEGER,
  does TEXT, networks TEXT, ports TEXT);
CREATE TABLE containers (name TEXT PRIMARY KEY, node TEXT, project TEXT);
CREATE TABLE routes (host TEXT, node TEXT, login TEXT, sso INTEGER, public INTEGER);
"""


def write_index(pages: list[Page], graph: dict[str, Any] | None, out: Path) -> None:
    out.unlink(missing_ok=True)
    db = sqlite3.connect(out)
    db.executescript(SCHEMA)
    ids = {p.id for p in pages}
    node_ids = {n["id"] for n in graph["nodes"]} if graph else set()
    for p in pages:
        fm = p.fm
        db.execute(
            "INSERT OR IGNORE INTO pages VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (
                p.id,
                fm and fm.title,
                fm and fm.kind,
                fm and fm.status,
                fm and fm.installed_by,
                fm and fm.verified.isoformat(),
                fm and fm.runs_on,
                fm and fm.part_of,
                node_of(p, node_ids),
                p.path,
                "\n".join(p.errors) or None,
            ),
        )
        for i, (title, body) in enumerate(p.sections):
            db.execute("INSERT INTO sections VALUES (?,?,?,?)", (p.id, i, title, body))
            db.execute("INSERT INTO sections_fts VALUES (?,?,?)", (p.id, title, body))
        for kind, dst in (fm.relations() if fm else []) + p.links:
            db.execute("INSERT INTO relations VALUES (?,?,?,?)", (p.id, kind, dst, dst in ids))
    for n in graph["nodes"] if graph else []:
        db.execute(
            "INSERT INTO nodes VALUES (?,?,?,?,?,?,?,?)",
            (
                n["id"],
                n["label"],
                n["zone"],
                n.get("project"),
                n.get("public", False),
                n.get("does"),
                json.dumps(n.get("networks", [])),
                json.dumps(n.get("ports", [])),
            ),
        )
        for c in n.get("containers", []):
            db.execute("INSERT OR IGNORE INTO containers VALUES (?,?,?)", (c, n["id"], n.get("project")))
        for r in n.get("routes", []):
            db.execute(
                "INSERT INTO routes VALUES (?,?,?,?,?)",
                (r["host"], n["id"], r["login"], r["sso"], r["public"]),
            )
    db.commit()
    db.close()
