#!/usr/bin/env bash
# Fail if anything secret-shaped is in the files that reach the browser or the data
# mounts (frontend bundle, schemas, fixtures, graph/status json passed as args).
# Mario's rule: no tokens lying around, nothing secret visible to the frontend.
set -euo pipefail
PATTERNS='(api[_-]?key|secret|passw(or)?d|token)["'"'"']?\s*[:=]\s*["'"'"'][^"'"'"']{8,}|-----BEGIN [A-Z ]*PRIVATE KEY|AGE-SECRET-KEY-|ghp_[A-Za-z0-9]{20,}|glpat-|hskey-|tk_[a-z0-9]{20,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}'
targets=("$@")
[ ${#targets[@]} -eq 0 ] && targets=(frontend/dist schemas packages/generator/tests/fixtures)
if grep -rEIn --exclude-dir=node_modules "$PATTERNS" "${targets[@]}"; then
  echo "secret-scan: secret-shaped content found (see above)" >&2
  exit 1
fi
echo "secret-scan: clean (${targets[*]})"
