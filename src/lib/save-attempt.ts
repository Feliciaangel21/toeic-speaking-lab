import type { RecordedAttempt } from "./types";
import { getSupabase } from "./supabase";

const LOCAL_KEY = "speaking-lab-attempts";
const BUCKET = "speaking-recordings";

function safeLocalAttempt(a: RecordedAttempt) {
  return {
    questionId: a.questionId,
    questionNumber: a.questionNumber,
    taskType: a.taskType,
    durationMs: a.durationMs,
    transcript: a.transcript ?? null,
    featureJson: a.featureJson ?? null,
    scoreJson: a.scoreJson ?? null,
    hasLocalAudio: Boolean(a.audioBlob),
    audioMimeType: a.audioMimeType ?? null,
  };
}

function saveLocal(attempts: RecordedAttempt[], mode:"mock"|"practice") {
  const existing = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  localStorage.setItem(LOCAL_KEY, JSON.stringify([
    { id: crypto.randomUUID(), mode, created_at: new Date().toISOString(), attempts: attempts.map(safeLocalAttempt) },
    ...existing,
  ].slice(0, 30)));
  return { mode: "local" as const };
}

function extensionForMime(mime?: string | null) {
  if (mime?.includes("mp4")) return "m4a";
  if (mime?.includes("ogg")) return "ogg";
  return "webm";
}

export async function saveMockSession(attempts: RecordedAttempt[], mode:"mock"|"practice"="mock") {
  const supabase = getSupabase();
  if (!supabase) return saveLocal(attempts, mode);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return saveLocal(attempts, mode);

  const { data: session, error: sessionError } = await supabase
    .from("mock_sessions")
    .insert({ user_id: user.id, mode, status: "completed" })
    .select("id")
    .single();
  if (sessionError) throw sessionError;

  for (const a of attempts) {
    const hasAudio = Boolean(a.audioBlob && a.audioBlob.size > 0);
    const { data: attempt, error: attemptError } = await supabase
      .from("question_attempts")
      .insert({
        session_id: session.id,
        user_id: user.id,
        question_id: a.questionId,
        question_number: a.questionNumber,
        task_type: a.taskType,
        response_duration_ms: a.durationMs,
        audio_duration_ms: a.durationMs,
        audio_mime_type: a.audioMimeType ?? null,
        audio_size_bytes: a.audioBlob?.size ?? null,
        upload_status: hasAudio ? "pending" : "not_recorded",
        transcript: a.transcript ?? null,
        feature_json: a.featureJson ?? null,
        score_json: a.scoreJson ?? null,
      })
      .select("id")
      .single();
    if (attemptError) throw attemptError;

    if (!hasAudio || !a.audioBlob) continue;

    const ext = extensionForMime(a.audioMimeType);
    const path = `${user.id}/${session.id}/q${String(a.questionNumber).padStart(2,"0")}-${attempt.id}.${ext}`;
    await supabase.from("question_attempts").update({ upload_status: "uploading" }).eq("id", attempt.id);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, a.audioBlob, { contentType: a.audioMimeType ?? "audio/webm", upsert: false });

    if (uploadError) {
      await supabase.from("question_attempts").update({ upload_status: "failed" }).eq("id", attempt.id);
      continue;
    }

    await supabase.from("question_attempts").update({ audio_path: path, upload_status: "uploaded" }).eq("id", attempt.id);
  }

  return { mode: "supabase" as const, sessionId: session.id };
}

export async function getAttemptRecordingSignedUrl(audioPath: string, expiresIn = 900) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(audioPath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
