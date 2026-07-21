#!/usr/bin/env bash
set -euo pipefail

files="$(git diff --cached --name-only --diff-filter=ACMR)"
if [ -z "$files" ]; then
  echo "No staged files to check."
  exit 0
fi

csv="$(printf '%s\n' "$files" | paste -sd, -)"

echo "Running affected checks for staged files..."
yarn nx affected -t lint,typecheck,test --files="$csv" --nxBail
echo "Staged checks passed."
