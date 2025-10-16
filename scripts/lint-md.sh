#!/usr/bin/env bash
set -euo pipefail

npx --yes markdownlint@0.41.0 "**/*.md" --ignore node_modules