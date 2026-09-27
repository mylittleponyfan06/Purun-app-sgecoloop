import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

// Use the existing TypeScript compiler to render the actual TSX without another test dependency.
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier, context.parentURL?.startsWith("data:") ? { ...context, parentURL: import.meta.url } : context);
} });
const source = await readFile(new URL("../components/LeafLoader.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext } });
const { default: LeafLoader } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const render = (props) => renderToStaticMarkup(createElement(LeafLoader, props));
const normal = render({ label: "Finding your area…", detail: "Allow location when prompted." });
assert.match(normal, /role="status"/);
assert.match(normal, /aria-atomic="true"/);
assert.match(normal, /aria-hidden="true"/);
assert.equal((normal.match(/<svg /g) ?? []).length, 3);
assert.match(normal, /Finding your area…/);
assert.match(normal, /Allow location when prompted/);
assert.doesNotMatch(normal, /<img|src=|https?:/);
const button = render({ label: "Checking", compact: true, announce: false });
assert.match(button, /leaf-loader-compact/);
assert.doesNotMatch(button, /role="status"|<div|<button/);
assert.match(render({ label: "<script>unsafe</script>" }), /&lt;script&gt;/);
console.log("Leaf loader checks passed: accessible status, decorative inline assets, compact button markup and escaped labels.");
