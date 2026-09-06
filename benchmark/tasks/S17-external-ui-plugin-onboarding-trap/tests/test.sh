#!/bin/bash
# Grade only the agent's artifacts. Judge self-tests run separately in CI.
set -eu
TEST_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p /logs/verifier
node "$TEST_DIR/judge.mjs" > /logs/verifier/judge.out 2>&1
cat /logs/verifier/judge.out
node -e '
const fs = require("node:fs");
const lines = fs.readFileSync("/logs/verifier/judge.out", "utf8").trim().split("\n");
let score = 0;
try {
  const result = JSON.parse(lines.at(-1));
  if (Number.isFinite(result.score) && result.max === 100) score = result.score;
} catch {}
fs.writeFileSync("/logs/verifier/reward.txt", Math.max(0, Math.min(1, score / 100)) + "\n");
'
