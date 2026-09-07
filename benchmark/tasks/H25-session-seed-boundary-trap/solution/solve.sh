#!/bin/bash
# Oracle solution: replace the fixture fork-state module with the alpha.4 migration.
set -e
cp "$(dirname "$0")/src/fork-state.mjs" /app/fixture/src/fork-state.mjs
