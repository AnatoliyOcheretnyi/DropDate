#!/usr/bin/env bash
set -euo pipefail

files="$(git diff --cached --name-only --diff-filter=ACMR)"
if [ -z "$files" ]; then
  echo "No staged files to check."
  exit 0
fi

csv="$(printf '%s\n' "$files" | paste -sd, -)"

format_files="$(printf '%s\n' "$files" | grep -E '^apps/mobile/(app|src)/.*\.(ts|tsx)$|^apps/mobile/(app|project)\.json$' || true)"
if [ -n "$format_files" ]; then
  echo "Checking mobile formatting..."
  printf '%s\n' "$format_files" | xargs yarn prettier --check
fi

echo "Running affected checks for staged files..."
yarn nx affected -t lint,typecheck,test --files="$csv" --nxBail
echo "Staged checks passed."
