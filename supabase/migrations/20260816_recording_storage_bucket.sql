-- Private Storage bucket for student recordings.
-- The upload path convention is `{user_id}/{session_id}/qNN-{attempt_id}.{ext}`,
-- so every policy scopes access by the first path segment.
-- Safe to run more than once in the Supabase SQL editor.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'speaking-recordings',
  'speaking-recordings',
  false,
  26214400, -- 25 MB; a single 60s Opus response is well under 1 MB.
  array['audio/webm','audio/mp4','audio/ogg','audio/mpeg']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Browser access stays owner-scoped. The evaluation runner reads recordings
-- with the service-role key, which bypasses these policies.
drop policy if exists "users upload own recordings" on storage.objects;
create policy "users upload own recordings" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'speaking-recordings'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Required for createSignedUrl() on the dashboard playback path.
drop policy if exists "users read own recordings" on storage.objects;
create policy "users read own recordings" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'speaking-recordings'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Required for the rollback in saveMockSession() when the attempt insert fails
-- after its audio already uploaded.
drop policy if exists "users delete own recordings" on storage.objects;
create policy "users delete own recordings" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'speaking-recordings'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
