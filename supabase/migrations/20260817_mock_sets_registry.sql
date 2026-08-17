-- mock_sets already exists on the live project (created outside this repo's
-- migrations). This captures its schema so a fresh checkout can reproduce it;
-- it mirrors practice_sets exactly.
create table if not exists public.mock_sets (
  id text primary key,
  set_number integer not null unique check (set_number >= 1 and set_number <= 15),
  payload jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.mock_sets enable row level security;

drop policy if exists "public read active mock sets" on public.mock_sets;
create policy "public read active mock sets"
  on public.mock_sets
  for select
  using (active = true);
