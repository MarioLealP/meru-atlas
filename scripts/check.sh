#!/usr/bin/env bash
# Every Python check CI runs, runnable locally: lint, format, types, file size, the lockfile, pip-audit, tests.
# The frontend's checks (prettier, svelte-check, vitest, the bundle's secret scan) run in the Dockerfile's web stage,
# so the build can't produce an image that skipped them - and the check runner needs no Node.
set -euo pipefail
cd "$(dirname "$0")/.."

step() { printf '\n== %s\n' "$*"; }

step ruff
uv run ruff check .
uv run ruff format --check .
step ty
uv run ty check
step "no source file over 500 lines"
# Not the template's src/: this is a uv workspace, the code sits in packages/{api,generator}/src.
too_long=$(find packages/*/src -name '*.py' -exec awk 'FNR == 501 { print FILENAME }' {} +)
if [[ -n $too_long ]]; then
  printf '%s\n' "$too_long"
  exit 1
fi
step "uv.lock up to date"
uv lock --check
step pip-audit
# --no-emit-workspace --all-packages: the template's single project is a workspace of two packages here.
uvx pip-audit --disable-pip --require-hashes --progress-spinner off \
  -r <(uv export --frozen --no-emit-project --no-emit-workspace --all-packages --quiet)
step "pytest, 2 minutes at most"
timeout 120 uv run pytest -q
printf '\nall checks passed\n'
