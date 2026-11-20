const ts = require("typescript");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");
module.exports = function load(relative, mocks = {}, globals = {}) {
  const filename = path.resolve(__dirname, "..", relative);
  const localRequire = createRequire(filename);
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  const context = {
    exports: module.exports,
    module,
    require: (id) => (id in mocks ? mocks[id] : localRequire(id)),
    URL,
    URLSearchParams,
    AbortController,
    DOMException,
    Response,
    setTimeout,
    clearTimeout,
    console,
    process,
    __DEV__: true,
    ...globals,
  };
  vm.runInNewContext(output, context, { filename });
  return module.exports;
};
