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

echo "Checks passed. Bumping ${app} version..."

chmod +x scripts/bump-version.sh
next="$(scripts/bump-version.sh "$app" "$bump")"

git add "apps/${app}/VERSION"
git commit -m "chore(${app}): bump version to ${next}"
git tag "${app}/v${next}"

branch="$(git rev-parse --abbrev-ref HEAD)"
git push origin "$branch" --tags

echo "Released ${app}/v${next}"
