"""atlas-gen CLI. Phase 0: `atlas-gen validate <graph|status> <file>`."""

import argparse
import json
import sys

from atlas_gen import contracts


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="atlas-gen")
    sub = ap.add_subparsers(dest="cmd", required=True)
    v = sub.add_parser("validate", help="validate a data file against its schema")
    v.add_argument("schema", choices=contracts.SCHEMAS)
    v.add_argument("file")
    args = ap.parse_args(argv)

    with open(args.file, encoding="utf-8") as f:
        errs = contracts.errors(args.schema, json.load(f))
    for e in errs:
        print(e, file=sys.stderr)
    return 1 if errs else 0


if __name__ == "__main__":
    raise SystemExit(main())
