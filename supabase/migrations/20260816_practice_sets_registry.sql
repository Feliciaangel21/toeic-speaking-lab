create table if not exists public.practice_sets (
  id text primary key,
  set_number integer not null unique check (set_number >= 1 and set_number <= 15),
  payload jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.practice_sets enable row level security;

drop policy if exists "public read active practice sets" on public.practice_sets;
create policy "public read active practice sets"
  on public.practice_sets
  for select
  using (active = true);
