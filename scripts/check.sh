#!/usr/bin/env bash
# Every Python check CI runs, runnable locally: lint, format, types, the lockfile, known-vulnerable dependencies,
# tests. The frontend's checks (prettier, svelte-check, vitest, the bundle's secret scan) run in the Dockerfile's
# web stage, so the build can't produce an image that skipped them - and the check runner needs no Node.
set -euo pipefail
cd "$(dirname "$0")/.."

step() { printf '\n== %s\n' "$*"; }

step ruff
uv run ruff check .
uv run ruff format --check .
step ty
uv run ty check
step "uv.lock up to date"
uv lock --check
step pip-audit
uvx pip-audit --disable-pip --require-hashes --progress-spinner off \
  -r <(uv export --frozen --no-emit-project --no-emit-workspace --all-packages --quiet)
step pytest
uv run pytest -q
printf '\nall checks passed\n'
