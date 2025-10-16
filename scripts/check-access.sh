#!/usr/bin/env bash
set -euo pipefail

URL="${SUPABASE_URL:-}"
KEY="${SUPABASE_ANON_KEY:-}"

if [[ -z "$URL" || -z "$KEY" ]]; then
  echo "Set SUPABASE_URL and SUPABASE_ANON_KEY (or SERVICE_ROLE)"; exit 1;
fi

echo "🔎 Checking Supabase REST..."
curl -sS -H "apikey: $KEY" -H "Authorization: Bearer $KEY" "$URL/rest/v1/" | head -n 1 || true
echo "Done."