"""atlas-gen CLI.

atlas-gen build <infra-repo> [-o graph.json]                  generate + validate the graph
atlas-gen docs <infra-repo> [--graph g.json] [-o docs.json]   check + render the docs pages
atlas-gen docs-index <infra-repo> [--graph g.json] -o x.db    the pages + map facts as SQLite
atlas-gen validate <graph|status|docs> <file>                 validate a data file
"""

import argparse
import json
import sys
from pathlib import Path

from atlas_gen.core import contracts
from atlas_gen.docs.build import build_docs, check, load
from atlas_gen.docs.index import write_index
from atlas_gen.graph.build import build


def main(argv: list[str] | None = None) -> int:
    """Run one subcommand; the return value is the process exit code."""
    ap = argparse.ArgumentParser(prog="atlas-gen")
    sub = ap.add_subparsers(dest="cmd", required=True)
    v = sub.add_parser("validate", help="validate a data file against its schema")
    v.add_argument("schema", choices=contracts.SCHEMAS)
    v.add_argument("file")
    b = sub.add_parser("build", help="generate graph.json from an infra repo checkout")
    b.add_argument("repo", type=Path)
    b.add_argument("-o", "--out", type=Path, help="output file (default: stdout)")
    b.add_argument("--with-commit", action="store_true", help="record the infra HEAD (output then changes per commit)")
    d = sub.add_parser("docs", help="check the docs pages and write docs.json (fails on any problem)")
    di = sub.add_parser("docs-index", help="write the pages + map facts as SQLite (even with problems)")
    for p in (d, di):
        p.add_argument("repo", type=Path)
        p.add_argument("--graph", type=Path, help="graph.json, to check page -> map node links")
    d.add_argument("-o", "--out", type=Path, help="output file (default: stdout)")
    di.add_argument("-o", "--out", type=Path, required=True)
    args = ap.parse_args(argv)

    if args.cmd in ("docs", "docs-index"):
        return _docs(args)

    if args.cmd == "build":
        graph = build(args.repo, with_commit=args.with_commit)
        if errs := contracts.errors("graph", graph):
            print("\n".join(errs), file=sys.stderr)
            return 1
        text = json.dumps(graph, indent=1, ensure_ascii=False, sort_keys=False) + "\n"
        if args.out:
            args.out.write_text(text, encoding="utf-8")
        else:
            sys.stdout.write(text)
        for w in graph["warnings"]:
            print(f"warning: {w}", file=sys.stderr)
        return 0

    with open(args.file, encoding="utf-8") as f:
        errs = contracts.errors(args.schema, json.load(f))
    for e in errs:
        print(e, file=sys.stderr)
    return 1 if errs else 0


def _docs(args: argparse.Namespace) -> int:
    graph = json.loads(args.graph.read_text(encoding="utf-8")) if args.graph else None
    pages = load(args.repo)
    problems = check(pages, graph)
    for e in problems:
        print(f"error: {e}", file=sys.stderr)
    if args.cmd == "docs-index":
        write_index(pages, graph, args.out)
        print(f"{len(pages)} pages, {len(problems)} problems -> {args.out}", file=sys.stderr)
        return 0
    if problems:
        return 1
    docs = build_docs(pages, graph)
    if errs := contracts.errors("docs", docs):
        print("\n".join(errs), file=sys.stderr)
        return 1
    text = json.dumps(docs, indent=1, ensure_ascii=False) + "\n"
    if args.out:
        args.out.write_text(text, encoding="utf-8")
    else:
        sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
