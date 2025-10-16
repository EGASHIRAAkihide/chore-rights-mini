#!/usr/bin/env bash
set -euo pipefail

# Ensure web starts and Playwright runs a single worker to reduce flakiness
pnpm --filter @chorerights/web dev &

WEB_PID=$!
trap "kill $WEB_PID || true" EXIT

# wait a bit for dev server
node -e "setTimeout(()=>process.exit(0), 2500)"

pnpm test:e2e
