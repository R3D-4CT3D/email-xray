#!/bin/sh
# Rebuild the vendored .msg parser. Run from this folder: npm ci && npm run build
set -e
OUT=../../src/vendor
npx esbuild entry.js --bundle --minify --format=iife --platform=browser \
  --inject:./shim.js --legal-comments=none --metafile=meta.json \
  --banner:js="/* Bundle of @kenjiuno/msgreader 1.28.0 and its dependencies for Email X-Ray. Licenses: THIRD_PARTY_LICENSES.txt */" \
  --outfile=$OUT/msgreader.min.js
# Collect the license of every package that ended up in the bundle.
node -e '
const fs = require("fs"), path = require("path");
const meta = JSON.parse(fs.readFileSync("meta.json"));
const pkgs = new Set();
for (const f of Object.keys(meta.inputs)) {
  const m = f.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
  if (m) pkgs.add(m[1]);
}
let out = "Third-party code bundled in msgreader.min.js\n";
for (const p of [...pkgs].sort()) {
  const dir = path.join("node_modules", p);
  const { version, license } = JSON.parse(fs.readFileSync(path.join(dir, "package.json")));
  const lic = fs.readdirSync(dir).find(n => /^licen[sc]e/i.test(n));
  out += "\n" + "=".repeat(72) + "\n" + p + "@" + version + " (" + license + ")\n" + "=".repeat(72) + "\n";
  out += lic ? fs.readFileSync(path.join(dir, lic), "utf8") : "No license file shipped; see package.json license field.\n";
}
fs.writeFileSync(process.argv[1], out);
' "$OUT/THIRD_PARTY_LICENSES.txt"
rm meta.json
