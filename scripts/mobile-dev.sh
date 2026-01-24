#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(dirname "$0")"

cd "$SCRIPT_DIR/../apps/mobile"

echo "Installing dependencies..."
yarn install

if [ -d "ios" ]; then
  echo "Installing CocoaPods..."
  (cd ios && pod install)
fi

HAS_NATIVE=false
if [ -d "ios" ] || [ -d "android" ]; then
  HAS_NATIVE=true
fi

TARGET="${1:-start}"
case "$TARGET" in
  ios)
    if [ "$HAS_NATIVE" = true ]; then
      echo "Starting Expo (iOS native)..."
      yarn run ios
    else
      echo "Starting Expo (iOS managed)..."
      yarn ios
    fi
    ;;
  android)
    if [ "$HAS_NATIVE" = true ]; then
      echo "Starting Expo (Android native)..."
      yarn run android
    else
      echo "Starting Expo (Android managed)..."
      yarn android
    fi
    ;;
  start|dev)
    echo "Starting Expo..."
    yarn start
    ;;
  *)
    echo "Unknown target: $TARGET"
    echo "Use: dev:mobile [start|ios|android]"
    exit 1
    ;;
esac
