#!/usr/bin/env bash
set -euo pipefail
docker run --rm --entrypoint node todo-health-test:local -e '
const fs = require("node:fs");
for (const path of ["/usr/local/lib/node_modules/npm", "/usr/local/lib/node_modules/corepack", "/usr/local/bin/npm", "/usr/local/bin/npx", "/usr/local/bin/corepack"]) {
  if (fs.existsSync(path)) { console.error(`Unexpected runtime package manager: ${path}`); process.exitCode = 1; }
}
'
project="health-${USER:-test}-$$"
compose=(docker compose -p "$project" -f tests/compose.health.yml)
trap '"${compose[@]}" down --volumes --remove-orphans' EXIT
"${compose[@]}" up -d --wait
sha=$(git rev-parse HEAD)
probe='const [expected, sha] = process.argv.slice(1); (async () => { for (let i=0;i<30;i++) { try { const r=await fetch("http://127.0.0.1:3000/health", {signal: AbortSignal.timeout(4000)}); const body=await r.json(); if (r.status===Number(expected) && body.revision===sha && body.status===(expected==="200" ? "ok" : "unavailable")) return; } catch {} await new Promise(r=>setTimeout(r,1000)); } process.exit(1); })();'
"${compose[@]}" exec -T app node -e "$probe" 200 "$sha"
"${compose[@]}" stop db
"${compose[@]}" exec -T app node -e "$probe" 503 "$sha"
