import json
import sqlite3
from pathlib import Path

from atlas_gen import contracts
from atlas_gen.build import build
from atlas_gen.cli import main
from atlas_gen.docs.build import build_docs, check, load
from atlas_gen.docs.index import write_index

INFRA = Path(__file__).parent / "fixtures" / "infra"

GOOD = {
    "server/web.md": """---
title: Web
kind: app
installed-by: "repo: projects/web"
status: active
verified: 2026-10-08
---
# Web

## What it is
The web app, behind [[caddy]] and [[desktop|the desktop's]] browser.

## Credentials & certs
- none
""",
    "server/caddy.md": """---
title: Caddy
kind: app
installed-by: "repo: projects/caddy"
status: active
verified: 2026-10-08
---
## What it is
Reverse proxy.

```
## not a section inside a fence
```
""",
    "desktop/desktop.md": """---
title: Desktop
kind: device
status: active
verified: 2026-09-01
---
## What it is
Windows box.

![[web-agent-desktop]]
""",
    "desktop/web-agent-desktop.md": """---
title: Web agent (desktop)
kind: component
runs-on: desktop
part-of: web
talks-to: caddy
installed-by: manual
status: junk?
verified: 2026-09-12
---
## What it is
A leftover <script>alert(1)</script> with [a bad link](javascript:alert(1)).
""",
}


def repo_with(tmp_path: Path, files: dict[str, str]) -> Path:
    for rel, text in files.items():
        p = tmp_path / "docs" / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8")
    return tmp_path


def graph():
    return build(INFRA)


def pages_by_id(docs):
    return {p["id"]: p for p in docs["pages"]}


def test_good_pages_have_no_problems_and_valid_output(tmp_path):
    pages = load(repo_with(tmp_path, GOOD))
    assert check(pages, graph()) == []
    docs = build_docs(pages, graph())
    assert contracts.errors("docs", docs) == []


def test_relations_reverse_and_children(tmp_path):
    docs = pages_by_id(build_docs(load(repo_with(tmp_path, GOOD)), graph()))
    agent = docs["web-agent-desktop"]
    assert {"kind": "runs-on", "to": "desktop"} in agent["relations"]
    assert {"kind": "part-of", "from": "web-agent-desktop"} in docs["web"]["backrefs"]
    assert {"kind": "mentions", "from": "web"} in docs["caddy"]["backrefs"]
    assert {"kind": "embeds", "from": "desktop"} in docs["web-agent-desktop"]["backrefs"]
    # folded into both the parent and the device (D4)
    assert docs["web"]["children"] == ["web-agent-desktop"]
    assert docs["desktop"]["children"] == ["web-agent-desktop"]


def test_page_maps_to_node_and_coverage(tmp_path):
    docs = build_docs(load(repo_with(tmp_path, GOOD)), graph())
    by = pages_by_id(docs)
    assert by["web"]["node"] == "web" and "node" not in by["desktop"]
    assert "authentik" in docs["uncovered_nodes"] and "web" not in docs["uncovered_nodes"]


def test_rendering_links_embeds_and_no_raw_html(tmp_path):
    by = pages_by_id(build_docs(load(repo_with(tmp_path, GOOD)), graph()))
    html = by["web"]["sections"][0]["blocks"][0]["html"]
    assert '<a href="#doc/caddy">Caddy</a>' in html
    assert '<a href="#doc/desktop">the desktop\'s</a>' in html
    assert [b for b in by["desktop"]["sections"][0]["blocks"] if "embed" in b] == [
        {"embed": "web-agent-desktop"}
    ]
    bad = by["web-agent-desktop"]["sections"][0]["blocks"][0]["html"]
    assert "<script>" not in bad and "&lt;script&gt;" in bad
    assert 'href="javascript:' not in bad
    assert [s["title"] for s in by["caddy"]["sections"]] == ["What it is"]  # fenced ## ignored


def test_problems_are_reported(tmp_path):
    files = dict(GOOD)
    files["server/broken.md"] = """---
title: Broken
kind: component
part-of: nowhere
status: maybe
verified: 2026-10-08
extra: 1
---
stray text
## Notes
See [[Zabbix]] and [[missing-page]].
"""
    files["other/web.md"] = GOOD["server/web.md"]
    files["server/no-origin.md"] = GOOD["server/caddy.md"].replace(
        'installed-by: "repo: projects/caddy"\n', ""
    )
    errs = "\n".join(check(load(repo_with(tmp_path, files)), graph()))
    for expected in (
        "installed-by is required",
        "status",
        "extra",
        "outside any `## ` section",
        "unknown section `## Notes`",
        "missing section `## What it is`",
        "[[Zabbix]] is not a page id",
        "mentions `missing-page`",
        "page id `web` is also used by",
    ):
        assert expected in errs, expected


def test_unknown_node_reference(tmp_path):
    files = {"x.md": GOOD["server/caddy.md"].replace("kind: app", "kind: app\nnode: nope")}
    assert any(
        "node `nope` is not on the atlas map" in e for e in check(load(repo_with(tmp_path, files)), graph())
    )


def test_cli_docs_fails_on_problems_and_writes_on_success(tmp_path, capsys):
    repo = repo_with(tmp_path / "r", GOOD)
    out = tmp_path / "docs.json"
    assert main(["docs", str(repo), "-o", str(out)]) == 0
    assert json.loads(out.read_text())["schema_version"] == 1
    (repo / "docs" / "bad.md").write_text("no frontmatter", encoding="utf-8")
    assert main(["docs", str(repo), "-o", str(tmp_path / "x.json")]) == 1
    assert "no `---` frontmatter" in capsys.readouterr().err


def test_sqlite_index_joins_pages_with_map_facts(tmp_path):
    repo = repo_with(tmp_path / "r", GOOD)
    db_path = tmp_path / "docs.sqlite"
    write_index(load(repo), graph(), db_path)
    db = sqlite3.connect(db_path)
    on_desktop = db.execute("SELECT id FROM pages WHERE runs_on = 'desktop'").fetchall()
    assert on_desktop == [("web-agent-desktop",)]
    no_page = db.execute(
        "SELECT n.id FROM nodes n LEFT JOIN pages p ON p.node = n.id WHERE p.id IS NULL ORDER BY n.id"
    ).fetchall()
    assert ("authentik",) in no_page and ("web",) not in no_page
    hit = db.execute("SELECT page FROM sections_fts WHERE sections_fts MATCH 'proxy'").fetchall()
    assert hit == [("caddy",)]
    assert db.execute("SELECT host FROM routes WHERE node = 'web' ORDER BY host").fetchall()
