-- Async local evaluation queue for TOEIC Speaking Lab.
-- Safe to run more than once in the Supabase SQL editor.

alter table public.mock_sessions
  add column if not exists mock_set_number integer,
  add column if not exists evaluation_status text not null default 'pending';

alter table public.question_attempts
  add column if not exists audio_path text,
  add column if not exists audio_mime_type text,
  add column if not exists audio_size_bytes bigint,
  add column if not exists audio_duration_ms integer,
  add column if not exists upload_status text,
  add column if not exists evaluation_status text not null default 'waiting_for_audio',
  add column if not exists evaluated_at timestamptz,
  add column if not exists evaluation_error text,
  add column if not exists evaluation_model_version text;

-- Keep states intentionally simple so the dashboard can render them directly.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'mock_sessions_evaluation_status_check'
  ) then
    alter table public.mock_sessions
      add constraint mock_sessions_evaluation_status_check
      check (evaluation_status in ('pending','processing','evaluated','failed','not_requested'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'question_attempts_evaluation_status_check'
  ) then
    alter table public.question_attempts
      add constraint question_attempts_evaluation_status_check
      check (evaluation_status in ('waiting_for_audio','pending','processing','completed','failed','not_requested'));
  end if;
end $$;


-- Backfill any rows created before async evaluation existed.
update public.question_attempts
set evaluation_status = case
  when upload_status = 'uploaded' and audio_path is not null then 'pending'
  when upload_status = 'failed' then 'failed'
  else 'not_requested'
end
where evaluation_status = 'waiting_for_audio';

create index if not exists question_attempts_eval_queue_idx
  on public.question_attempts(evaluation_status, created_at)
  where audio_path is not null;

create index if not exists mock_sessions_eval_status_idx
  on public.mock_sessions(user_id, evaluation_status, created_at desc);

-- Keep browser access insert/read-only. Evaluation writes use the trusted local server key.
drop policy if exists "users read own sessions" on public.mock_sessions;
create policy "users read own sessions" on public.mock_sessions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "users insert own sessions" on public.mock_sessions;
create policy "users insert own sessions" on public.mock_sessions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "users read own attempts" on public.question_attempts;
create policy "users read own attempts" on public.question_attempts
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "users insert own attempts" on public.question_attempts;
create policy "users insert own attempts" on public.question_attempts
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create index if not exists question_attempts_session_id_idx
  on public.question_attempts(session_id);
