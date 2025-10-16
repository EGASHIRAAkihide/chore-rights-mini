-- Migration: Core schema derived from docs/design/data_model.md
-- Tables, constraints, RLS policies, triggers, and RPC functions for ChoreRights MVP.

-- == TABLES ==

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  role text not null default 'creator' check (role in ('creator','licensee','admin')),
  wallet_address text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists users_role_idx on public.users (role);

create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  metadata jsonb,
  icc_code text not null unique,
  video_url text,
  fingerprint_id uuid,
  status text not null default 'ACTIVE' check (status in ('DRAFT','ACTIVE','ARCHIVED')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists works_owner_idx on public.works (owner_id);
create index if not exists works_icc_code_idx on public.works (icc_code);

create table if not exists public.fingerprints (
  id uuid primary key default gen_random_uuid(),
  algo text not null,
  hash text not null,
  work_id uuid not null references public.works (id) on delete cascade,
  created_by uuid references public.users (id),
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists fingerprints_hash_unique on public.fingerprints (hash);

do $$
begin
  alter table public.works
    add constraint works_fingerprint_id_fkey
    foreign key (fingerprint_id) references public.fingerprints (id) on delete set null;
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.license_requests (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works (id) on delete cascade,
  requester_id uuid not null references public.users (id) on delete cascade,
  request_data jsonb not null,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz
);

create index if not exists license_requests_work_idx on public.license_requests (work_id);
create index if not exists license_requests_requester_idx on public.license_requests (requester_id);

create table if not exists public.agreements (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works (id) on delete cascade,
  creator_id uuid not null references public.users (id) on delete cascade,
  licensee_id uuid not null references public.users (id) on delete cascade,
  terms jsonb not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','SIGNED','FINALIZED')),
  polygon_tx_hash text,
  signed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists agreements_work_idx on public.agreements (work_id);
create index if not exists agreements_parties_idx on public.agreements (creator_id, licensee_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  amount numeric(12,2) not null,
  currency text not null,
  source text not null default 'test' check (source in ('stripe','test','manual')),
  status text not null default 'RECORDED' check (status in ('RECORDED','DISTRIBUTED')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists payments_agreement_idx on public.payments (agreement_id);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id),
  kind text not null,
  meta jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists events_user_idx on public.events (user_id);
create index if not exists events_kind_idx on public.events (kind);

create table if not exists public.kpi_daily (
  day date primary key,
  signup_users integer default 0,
  work_count integer default 0,
  license_requests integer default 0,
  agreements integer default 0,
  api_uptime numeric(5,2),
  ai_precision numeric(5,2),
  updated_at timestamptz not null default timezone('utc', now())
);

-- == TRIGGER FUNCTIONS ==

create or replace function public.set_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

create or replace function public.set_default_hash()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.hash is null or length(new.hash) = 0 then
    new.hash := encode(digest(coalesce(new.algo, 'algo') || new.work_id::text || now()::text, 'sha256'), 'hex');
  end if;
  return new;
end;
$$;

do $$
begin
  create trigger set_fingerprints_created_by
    before insert on public.fingerprints
    for each row
    execute function public.set_created_by();
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create trigger set_fingerprints_default_hash
    before insert on public.fingerprints
    for each row
    execute function public.set_default_hash();
exception
  when duplicate_object then null;
end
$$;

-- == RLS POLICIES ==

alter table public.works enable row level security;
alter table public.fingerprints enable row level security;
alter table public.license_requests enable row level security;
alter table public.agreements enable row level security;
alter table public.payments enable row level security;
alter table public.events enable row level security;
alter table public.kpi_daily enable row level security;

do $$
begin
  create policy works_owner_select on public.works
    for select using (owner_id = auth.uid());
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy works_owner_modify on public.works
    using (owner_id = auth.uid());
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy fingerprints_owner_select on public.fingerprints
    for select using (created_by = auth.uid());
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy fingerprints_owner_modify on public.fingerprints
    using (created_by = auth.uid());
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy license_requests_access on public.license_requests
    for select using (
      requester_id = auth.uid()
      or exists (
        select 1
        from public.works w
        where w.id = license_requests.work_id
          and w.owner_id = auth.uid()
      )
    );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy license_requests_modify on public.license_requests
    using (
      requester_id = auth.uid()
      or exists (
        select 1
        from public.works w
        where w.id = license_requests.work_id
          and w.owner_id = auth.uid()
      )
    );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy agreements_participant_access on public.agreements
    for select using (creator_id = auth.uid() or licensee_id = auth.uid());
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy agreements_participant_modify on public.agreements
    using (creator_id = auth.uid());
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy payments_participant_access on public.payments
    for select using (
      exists (
        select 1
        from public.agreements a
        where a.id = payments.agreement_id
          and (a.creator_id = auth.uid() or a.licensee_id = auth.uid())
      )
    );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy payments_participant_modify on public.payments
    using (
      exists (
        select 1
        from public.agreements a
        where a.id = payments.agreement_id
          and a.creator_id = auth.uid()
      )
    );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy events_self_access on public.events
    for select using (user_id = auth.uid());
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy events_self_insert on public.events
    for insert with check (user_id = auth.uid());
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy kpi_daily_admin_access on public.kpi_daily
    for select using (current_setting('request.jwt.claim.role', true) = 'admin');
exception
  when duplicate_object then null;
end
$$;

-- == RPC & SUPPORT FUNCTIONS ==

create or replace function public.create_work_with_icc(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_work_id uuid := coalesce((payload->>'id')::uuid, gen_random_uuid());
  v_fingerprint_id uuid;
  v_owner uuid := auth.uid();
begin
  if v_owner is null then
    raise exception 'Authentication required';
  end if;

  insert into public.works (
    id,
    owner_id,
    title,
    description,
    metadata,
    icc_code,
    video_url,
    status
  )
  values (
    v_work_id,
    v_owner,
    coalesce(payload->>'title', 'Untitled Work'),
    payload->>'description',
    payload->'metadata',
    payload->>'icc_code',
    payload->>'video_url',
    coalesce(payload->>'status', 'ACTIVE')
  )
  on conflict (id) do update
    set title = excluded.title,
        description = excluded.description,
        metadata = excluded.metadata,
        icc_code = excluded.icc_code,
        video_url = excluded.video_url,
        status = excluded.status
  returning id into v_work_id;

  if payload ? 'fingerprint' then
    insert into public.fingerprints (work_id, algo, hash)
    values (
      v_work_id,
      coalesce(payload->'fingerprint'->>'algo', 'pose-v1'),
      coalesce(payload->'fingerprint'->>'hash', payload->'fingerprint'->>'hash_or_vector')
    )
    returning id into v_fingerprint_id;

    update public.works
      set fingerprint_id = v_fingerprint_id
      where id = v_work_id;
  end if;

  perform public.log_event('work.register', jsonb_build_object('work_id', v_work_id));
  return v_work_id;
end;
$$;

create or replace function public.approve_license_request(p_request_id uuid, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.license_requests%rowtype;
  v_work public.works%rowtype;
  v_agreement_id uuid;
begin
  select * into v_request from public.license_requests where id = p_request_id;
  if not found then
    raise exception 'License request not found';
  end if;

  select * into v_work from public.works where id = v_request.work_id;
  if not found then
    raise exception 'Related work missing';
  end if;

  if v_work.owner_id <> auth.uid() then
    raise exception 'Only the owner may approve this request';
  end if;

  if v_request.status <> 'PENDING' then
    raise exception 'Request already processed';
  end if;

  update public.license_requests
    set status = 'APPROVED',
        updated_at = timezone('utc', now())
    where id = p_request_id;

  insert into public.agreements (
    work_id,
    creator_id,
    licensee_id,
    terms,
    status
  )
  values (
    v_work.id,
    v_work.owner_id,
    v_request.requester_id,
    v_request.request_data,
    'SIGNED'
  )
  returning id into v_agreement_id;

  perform public.log_event(
    'license.approved',
    jsonb_build_object('request_id', p_request_id, 'agreement_id', v_agreement_id, 'note', p_note)
  );

  return v_agreement_id;
end;
$$;

create or replace function public.log_event(p_kind text, p_meta jsonb default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.events (user_id, kind, meta)
  values (auth.uid(), p_kind, p_meta);
end;
$$;

create or replace function public.aggregate_kpi_daily()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date;
  v_end date := current_date;
begin
  select coalesce(min(created_at)::date, current_date) into v_start from public.users;

  with series as (
    select generate_series(v_start, v_end, interval '1 day')::date as day
  ),
  aggregated as (
    select
      s.day,
      coalesce((select count(*) from public.users where created_at::date = s.day), 0) as signup_users,
      coalesce((select count(*) from public.works where created_at::date = s.day), 0) as work_count,
      coalesce((select count(*) from public.license_requests where created_at::date = s.day), 0) as license_requests,
      coalesce((select count(*) from public.agreements where created_at::date = s.day), 0) as agreements,
      coalesce((select avg((meta->>'uptime')::numeric) from public.events where kind = 'uptime.daily' and created_at::date = s.day), null) as api_uptime,
      coalesce((select avg((meta->>'precision')::numeric) from public.events where kind = 'ai.match' and created_at::date = s.day), null) as ai_precision
    from series s
  )
  insert into public.kpi_daily as kd (
    day,
    signup_users,
    work_count,
    license_requests,
    agreements,
    api_uptime,
    ai_precision,
    updated_at
  )
  select
    day,
    signup_users,
    work_count,
    license_requests,
    agreements,
    api_uptime,
    ai_precision,
    timezone('utc', now())
  from aggregated
  on conflict (day) do update
    set signup_users = excluded.signup_users,
        work_count = excluded.work_count,
        license_requests = excluded.license_requests,
        agreements = excluded.agreements,
        api_uptime = excluded.api_uptime,
        ai_precision = excluded.ai_precision,
        updated_at = excluded.updated_at;
end;
$$;
