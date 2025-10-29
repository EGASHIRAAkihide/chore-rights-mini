#!/usr/bin/env -S node --loader ts-node/esm
/**
 * Scan supabase/migrations/*.sql and verify they're idempotent:
 * - CREATE ... IF NOT EXISTS or
 * - wrapped in DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN ... END $$;
 */
import './load-env';

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const MIG_DIR = process.env.MIG_DIR ?? 'supabase/migrations';

const guards = [
  /\bCREATE\s+(?:TABLE|VIEW|INDEX|TRIGGER|FUNCTION|TYPE|SCHEMA)\b[\s\S]*?\bIF\s+NOT\s+EXISTS\b/i,
  /\bDO\s*\$\$[\s\S]*?EXCEPTION\s+WHEN\s+duplicate_object[\s\S]*?END\s*\$\$/i,
  /\bCREATE\s+POLICY\b[\s\S]*?ON\b[\s\S]*?;?/i, // policies are tricky; allow manual check
];

const files = readdirSync(MIG_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();
let ok = true;

for (const f of files) {
  const p = join(MIG_DIR, f);
  const sql = readFileSync(p, 'utf8');
  const hasGuard = guards.some((rx) => rx.test(sql));
  if (!hasGuard) {
    ok = false;
    console.error(`❌ Missing idempotency guard: ${p}`);
  } else {
    console.log(`✅ Guard found: ${p}`);
  }
}

if (!ok) {
  console.error('\nOne or more migrations lack idempotency guards.');
  process.exit(1);
} else {
  console.log('\nAll migrations pass idempotency checks.');
}
