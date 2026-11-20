const path = require("node:path");
const fs = require("node:fs");
process.env.EXPO_ROUTER_APP_ROOT = path.resolve(__dirname, "../app");
const output = path.resolve(__dirname, "../.expo/types");
fs.mkdirSync(output, { recursive: true });
require("expo-router/build/typed-routes").regenerateDeclarations(output);
