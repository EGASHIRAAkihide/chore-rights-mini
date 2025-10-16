#!/usr/bin/env bash
set -euo pipefail

npx --yes linkinator@6.0.3 docs --recurse --skip "mailto:|^#"