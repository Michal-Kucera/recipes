// Runs every suite against the single-file bundle (Recipes.html), which carries the same
// app.js/app.css/data.js as index.html. Exit code 1 if any FAIL line appears.
const { spawnSync } = require("child_process");
const fs = require("fs"), path = require("path");
let pass = 0, fail = 0;
for (const f of fs.readdirSync(__dirname).filter(n => /^t\d+\.js$/.test(n)).sort()) {
  const res = spawnSync(process.execPath, [path.join(__dirname, f)], { encoding: "utf8" });
  const out = (res.stdout || "") + (res.status ? "\nFAIL  suite crashed: " + (res.stderr || "").split("\n").slice(0, 2).join(" ") : "");
  const p = (out.match(/^PASS/gm) || []).length, fl = out.match(/^FAIL.*$/gm) || [];
  pass += p; fail += fl.length;
  console.log(`${f.padEnd(7)} ${String(p).padStart(3)} pass ${fl.length ? "  " + fl.join(" | ") : ""}`);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
