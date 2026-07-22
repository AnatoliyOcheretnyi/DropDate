#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/apps/mobile"
PLATFORM="${1:-}"

if [ "$PLATFORM" != "ios" ] && [ "$PLATFORM" != "android" ]; then
  echo "Usage: yarn mobile:ios | yarn mobile:android"
  exit 1
fi

shift

echo "Installing workspace dependencies..."
cd "$ROOT_DIR"
yarn install --frozen-lockfile

echo "Installing mobile dependencies..."
cd "$MOBILE_DIR"
yarn install --frozen-lockfile

if [ "$PLATFORM" = "ios" ]; then
  if ! command -v pod >/dev/null 2>&1; then
    echo "CocoaPods is required for an iOS native build."
    echo "Install it first, then run: yarn mobile:ios"
    exit 1
  fi

  echo "Installing iOS pods..."
  cd "$MOBILE_DIR/ios"
  pod install
fi

cd "$MOBILE_DIR"
echo "Starting Metro and a clean $PLATFORM native build..."
npx expo "run:$PLATFORM" --no-build-cache "$@"
