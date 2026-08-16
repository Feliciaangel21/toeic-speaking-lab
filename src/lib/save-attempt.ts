import type { RecordedAttempt } from "./types";
import { getSupabase } from "./supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

const LOCAL_KEY = "speaking-lab-attempts";
const BUCKET = "speaking-recordings";

export type SaveResult =
  | { mode: "local"; error?: string }
  | { mode: "supabase"; sessionId: string };

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

function saveLocal(attempts: RecordedAttempt[], mode:"mock"|"practice"): { mode: "local"; error?: string } {
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

// MediaRecorder reports values like "audio/webm;codecs=opus", but the bucket
// MIME allowlist matches literally. Upload the base type; the attempt row still
// keeps the full string for the evaluation runner.
function storageContentType(mime?: string | null) {
  return (mime ?? "audio/webm").split(";")[0].trim();
}

export async function saveMockSession(attempts: RecordedAttempt[], mode:"mock"|"practice"="mock", mockSetNumber?: number): Promise<SaveResult> {
  const supabase = getSupabase();
  if (!supabase) return saveLocal(attempts, mode);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return saveLocal(attempts, mode);

  try {
    return await saveToSupabase(supabase, user.id, attempts, mode, mockSetNumber);
  } catch (error) {
    // A finished set is 20+ minutes of work, so a server failure must never end
    // with nothing saved. Keep the on-device copy and let the runner say so.
    return { ...saveLocal(attempts, mode), error: error instanceof Error ? error.message : String(error) };
  }
}

async function saveToSupabase(
  supabase: SupabaseClient,
  userId: string,
  attempts: RecordedAttempt[],
  mode: "mock"|"practice",
  mockSetNumber?: number,
): Promise<SaveResult> {
  const hasAnyAudio = attempts.some((attempt) => Boolean(attempt.audioBlob && attempt.audioBlob.size > 0));
  const { data: session, error: sessionError } = await supabase
    .from("mock_sessions")
    .insert({
      user_id: userId,
      mode,
      status: "completed",
      mock_set_number: mockSetNumber ?? null,
      evaluation_status: hasAnyAudio ? "pending" : "not_requested",
    })
    .select("id")
    .single();
  if (sessionError) throw sessionError;

  for (const a of attempts) {
    const hasAudio = Boolean(a.audioBlob && a.audioBlob.size > 0);
    const attemptId = crypto.randomUUID();
    const ext = extensionForMime(a.audioMimeType);
    const path = hasAudio ? `${userId}/${session.id}/q${String(a.questionNumber).padStart(2,"0")}-${attemptId}.${ext}` : null;

    let uploadStatus = hasAudio ? "uploaded" : "not_recorded";
    let evaluationStatus = hasAudio ? "pending" : "not_requested";
    let evaluationError: string | null = null;

    // Upload first, then insert the final DB row once. This keeps browser RLS
    // insert-only and avoids granting users UPDATE access to score columns.
    if (hasAudio && a.audioBlob && path) {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, a.audioBlob, { contentType: storageContentType(a.audioMimeType), upsert: false });

      if (uploadError) {
        uploadStatus = "failed";
        evaluationStatus = "failed";
        evaluationError = `Audio upload failed: ${uploadError.message}`;
      }
    }

    const { error: attemptError } = await supabase
      .from("question_attempts")
      .insert({
        id: attemptId,
        session_id: session.id,
        user_id: userId,
        question_id: a.questionId,
        question_number: a.questionNumber,
        task_type: a.taskType,
        response_duration_ms: a.durationMs,
        audio_duration_ms: a.durationMs,
        audio_mime_type: a.audioMimeType ?? null,
        audio_size_bytes: a.audioBlob?.size ?? null,
        audio_path: uploadStatus === "uploaded" ? path : null,
        upload_status: uploadStatus,
        evaluation_status: evaluationStatus,
        evaluation_error: evaluationError,
        transcript: a.transcript ?? null,
        feature_json: a.featureJson ?? null,
        score_json: a.scoreJson ?? null,
      });
    if (attemptError) {
      if (uploadStatus === "uploaded" && path) {
        await supabase.storage.from(BUCKET).remove([path]).catch(() => undefined);
      }
      throw attemptError;
    }
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
