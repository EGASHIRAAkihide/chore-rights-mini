-- Minimal seed for PoC QA env
insert into auth.users(id, email) values
  ('00000000-0000-0000-0000-000000000001','creator@test.local') on conflict do nothing;
insert into auth.users(id, email) values
  ('00000000-0000-0000-0000-000000000002','licensee@test.local') on conflict do nothing;
insert into auth.users(id, email) values
  ('00000000-0000-0000-0000-000000000003','admin@test.local') on conflict do nothing;

-- Optional reference data (tariffs, templates) — adjust to your schema
-- insert into license_templates(...) values (...);