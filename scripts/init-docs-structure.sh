#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"

mkdir -p "$ROOT/docs"/{architecture,legal,requirements,design,poc,kpi,testing,release,dev}
touch "$ROOT/docs/README.md"

cat > "$ROOT/docs/README.md" << 'MD'
# ChoreRights Documentation Index

- architecture/
  - chore-rights_mvp_architecture.md
- legal/
  - chore-rights_legal_brief_poc.md
- requirements/
  - 01_business_requirements.md
  - 02_product_requirements.md
- design/
  - api_contracts.md
  - data_model.md
- poc/
  - poc_plan_2025Q4-2026Q1.md
- kpi/
  - kgi_kpi_plan.csv
- testing/
  - test_plan.md
- release/
  - uat_signoff.md
- dev/
  - verification_checklist.md
MD

echo "Docs structure initialized at $ROOT/docs"