-- Speaking Lab persistence schema. Run in Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists public.mock_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null default 'mock' check (mode in ('mock','practice')),
  status text not null default 'completed',
  estimated_score integer,
  score_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.mock_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  question_number integer not null,
  task_type text not null,
  response_duration_ms integer not null default 0,
  transcript text,
  feature_json jsonb,
  score_json jsonb,
  created_at timestamptz not null default now()
);

-- Optional admin copy of the static bank. The app does NOT require this table to run.
create table if not exists public.question_bank (
  id text primary key,
  kind text not null,
  payload jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.mock_sessions enable row level security;
alter table public.question_attempts enable row level security;
alter table public.question_bank enable row level security;

drop policy if exists "users read own sessions" on public.mock_sessions;
create policy "users read own sessions" on public.mock_sessions for select using (auth.uid() = user_id);
drop policy if exists "users insert own sessions" on public.mock_sessions;
create policy "users insert own sessions" on public.mock_sessions for insert with check (auth.uid() = user_id);

drop policy if exists "users read own attempts" on public.question_attempts;
create policy "users read own attempts" on public.question_attempts for select using (auth.uid() = user_id);
drop policy if exists "users insert own attempts" on public.question_attempts;
create policy "users insert own attempts" on public.question_attempts for insert with check (auth.uid() = user_id);

-- Public read-only access to active practice questions; only service-role/admin should write.
drop policy if exists "public read active question bank" on public.question_bank;
create policy "public read active question bank" on public.question_bank for select using (active = true);

create index if not exists question_attempts_user_created_idx on public.question_attempts(user_id, created_at desc);
create index if not exists mock_sessions_user_created_idx on public.mock_sessions(user_id, created_at desc);

create table if not exists public.practice_guides (
  question_id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.practice_guides enable row level security;
drop policy if exists "public read practice guides" on public.practice_guides;
create policy "public read practice guides" on public.practice_guides for select using (true);
