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

# Apply app config/plugins even when generated native folders already exist.
npx expo prebuild --platform "$PLATFORM" --no-install

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

# With a phone plugged in and no target given, `expo run:ios` builds for the
# device, and a device build needs a signing team — so the command stops on an
# interactive "Development team for signing the app" prompt. Default to a
# simulator instead, which needs no signing at all. Pass a target explicitly
# (`yarn mobile:ios -d "Anatolii's iPhone"`) to build for hardware.
if [ "$PLATFORM" = "ios" ] && [ "$#" -eq 0 ]; then
  SIMULATOR_ID="$(xcrun simctl list devices available --json | node -e '
    let raw = "";
    process.stdin.on("data", (d) => (raw += d)).on("end", () => {
      const all = Object.values(JSON.parse(raw).devices).flat();
      const phones = all.filter((d) => d.name.startsWith("iPhone"));
      // A simulator that is already open beats booting another one.
      const pick = phones.find((d) => d.state === "Booted") ?? phones.pop();
      if (pick) process.stdout.write(pick.udid);
    });
  ')"
  if [ -n "$SIMULATOR_ID" ]; then
    echo "Targeting iOS simulator $SIMULATOR_ID (pass -d to build for a device)."
    set -- -d "$SIMULATOR_ID"
  fi
fi

# We want one command that builds the native app AND leaves an active Metro
# server in this terminal. Metro must run in the *foreground* — backgrounding
# it (`expo start &`) makes it stop the moment it tries to read stdin
# (SIGTTIN), which is why the server kept dying. So:
#   1. build + install the native app with --no-bundler (no server yet),
#   2. hand the terminal over to Metro via `exec`, so it becomes the process
#      and stays until you press Ctrl+C.
echo "Running a clean $PLATFORM native build (bundler starts after)..."
npx expo "run:$PLATFORM" --no-build-cache --no-bundler "$@"

echo ""
echo "Native app installed. Starting Metro — it stays here until Ctrl+C."
echo "If the app shows a connection error, reload it once Metro is ready."
exec npx expo start --dev-client
