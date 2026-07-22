#!/usr/bin/env bash
set -euo pipefail

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "Git metadata is unavailable; skipping hook installation."
  exit 0
fi

git config core.hooksPath .githooks
git config pull.rebase true
echo "Git hooks enabled from .githooks; git pull will rebase local commits."
