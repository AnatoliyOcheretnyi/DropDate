#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Usage: $0 <frontend|backend|mobile> <version>"
  exit 1
fi

app="$1"
version="$2"

case "$app" in
  frontend|backend|mobile)
    ;;
  *)
    echo "Unknown app: $app"
    exit 1
    ;;
esac

tag="${app}/v${version}"

git tag "$tag"
git push origin "$tag"

echo "Created and pushed tag: $tag"
