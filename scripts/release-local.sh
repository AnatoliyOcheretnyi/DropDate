#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Usage: $0 <frontend|backend|mobile> <major|minor|patch>"
  exit 1
fi

app="$1"
bump="$2"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Working tree is not clean. Commit or stash changes first."
  exit 1
fi

echo "Running release checks for ${app} before changing its version..."
case "$app" in
  frontend)
    yarn nx run-many -t lint,typecheck,test,build -p frontend --nxBail --skipNxCache
    yarn nx run frontend:e2e --nxBail --skipNxCache
    ;;
  backend)
    yarn nx run-many -t lint,test,build -p backend --nxBail --skipNxCache
    yarn nx run backend:race --skipNxCache
    ;;
  mobile)
    yarn nx run mobile:lint --skipNxCache
    ;;
esac

echo "Checks passed. Requesting verified release; CI will deploy before bumping the version..."
branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" != "main" ]; then
  echo "Verified releases must be requested from main (current: ${branch})."
  exit 1
fi

marker_app="$app"
if [ "$app" = "frontend" ]; then marker_app="front"; fi
git commit --allow-empty -m "chore(release): request ${app} ${bump}" -m "#release:${marker_app}:${bump}"
git push origin "$branch"

echo "Release requested. CI will publish the version and tag only after deployment succeeds."
