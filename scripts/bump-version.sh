#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Usage: $0 <frontend|backend|mobile> <major|minor|patch>"
  exit 1
fi

app="$1"
kind="$2"

case "$app" in
  frontend|backend|mobile) ;;
  *) echo "Unknown app: $app"; exit 1 ;;
esac

case "$kind" in
  major|minor|patch) ;;
  *) echo "Unknown bump: $kind"; exit 1 ;;
esac

version_file="apps/${app}/VERSION"
if [ ! -f "$version_file" ]; then
  echo "Missing VERSION file: $version_file"
  exit 1
fi

current="$(cat "$version_file" | tr -d '[:space:]')"
IFS='.' read -r major minor patch <<< "$current"

major="${major:-0}"
minor="${minor:-0}"
patch="${patch:-0}"

case "$kind" in
  major)
    major=$((major + 1))
    minor=0
    patch=0
    ;;
  minor)
    minor=$((minor + 1))
    patch=0
    ;;
  patch)
    patch=$((patch + 1))
    ;;
esac

next="${major}.${minor}.${patch}"
echo "$next" > "$version_file"
echo "$next"
