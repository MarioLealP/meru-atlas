"""atlas-gen CLI.

atlas-gen build <infra-repo> [-o graph.json]   generate + validate the graph
atlas-gen validate <graph|status> <file>       validate a data file
"""

import argparse
import json
import sys
from pathlib import Path

from atlas_gen import contracts
from atlas_gen.build import build


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="atlas-gen")
    sub = ap.add_subparsers(dest="cmd", required=True)
    v = sub.add_parser("validate", help="validate a data file against its schema")
    v.add_argument("schema", choices=contracts.SCHEMAS)
    v.add_argument("file")
    b = sub.add_parser("build", help="generate graph.json from an infra repo checkout")
    b.add_argument("repo", type=Path)
    b.add_argument("-o", "--out", type=Path, help="output file (default: stdout)")
    args = ap.parse_args(argv)

    if args.cmd == "build":
        graph = build(args.repo)
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


if __name__ == "__main__":
    raise SystemExit(main())
