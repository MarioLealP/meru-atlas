#!/usr/bin/env bash
# Pull the current endfield.css from the design-system repo into src/styles/.
#
# The design system lives in its own (private) repo, git.clockmost.com/MarioGLealP/endfield-design;
# this app vendors a copy so a fresh clone builds offline. Re-run after the design system ships
# a new version. The raw HTTPS URL 404s for a private repo, so the default is a shallow SSH clone
# (the same key as every other Gitea push).
#
#   scripts/sync-endfield.sh
#   EF_SRC=~/Projects/endfield-design/endfield.css scripts/sync-endfield.sh   # local checkout
set -euo pipefail
cd "$(dirname "$0")/.."

DEST="src/styles/endfield.css"
SRC="${EF_SRC:-}"

if [ -z "$SRC" ]; then
  tmp=$(mktemp -d)
  trap 'rm -rf "$tmp"' EXIT
  git clone -q --depth 1 git@git.clockmost.com:MarioGLealP/endfield-design.git "$tmp/ef"
  SRC="$tmp/ef/endfield.css"
fi
cp "$SRC" "$DEST"

lines=$(wc -l < "$DEST")
echo "synced $DEST  (<-  ${EF_SRC:-endfield-design@main},  $lines lines)"
