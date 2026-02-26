import { $ } from "bun";

console.log("Building nelysia...\n");

await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir:      "./dist",
  format:      "esm",
  target:      "bun",
  naming:      "[dir]/[name].js",
  external:    ["elysia"],
});
console.log("ESM   → dist/index.js");

await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir:      "./dist",
  format:      "cjs",
  target:      "node",
  naming:      "[dir]/[name].cjs",
  external:    ["elysia"],
});
console.log("CJS   → dist/index.cjs");

await $`bunx tsc -p tsconfig.build.json --emitDeclarationOnly`;
console.log("Types → dist/index.d.ts\n🚀 Build complete!");
