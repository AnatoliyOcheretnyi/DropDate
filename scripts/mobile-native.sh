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

# Keep one long-lived Metro server in the foreground of this terminal so the
# app stays connected after the native build finishes. `expo run` on its own
# hands the bundler off and exits, leaving no active server. Instead we:
#   1. start Metro ourselves (backgrounded),
#   2. run the native build with --no-bundler so it reuses that Metro,
#   3. wait on Metro so the script stays alive until you Ctrl+C.
echo "Starting Metro dev server..."
npx expo start --dev-client &
METRO_PID=$!

# Tear Metro down on exit / Ctrl+C so we never leave an orphaned bundler.
cleanup() {
  kill "$METRO_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Running a clean $PLATFORM native build against that server..."
npx expo "run:$PLATFORM" --no-build-cache --no-bundler "$@"

echo "Build installed. Metro is still running — press Ctrl+C to stop."
wait "$METRO_PID"
