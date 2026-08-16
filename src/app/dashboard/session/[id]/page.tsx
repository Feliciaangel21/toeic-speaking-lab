"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type SessionRow = {
  id: string;
  mode: "mock" | "practice";
  evaluation_status: string;
  mock_set_number: number | null;
  score_json: Record<string, unknown> | null;
  created_at: string;
};

type AttemptRow = {
  id: string;
  question_number: number;
  task_type: string;
  transcript: string | null;
  feature_json: Record<string, unknown> | null;
  score_json: Record<string, unknown> | null;
  evaluation_status: string;
  evaluation_error: string | null;
};

function getNumber(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function getString(value: unknown) { return typeof value === "string" ? value : null; }

export default function SessionResultPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const [session, setSession] = useState<SessionRow | null>(null);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = getSupabase();
      if (!supabase) { setError("결과 저장 기능에 연결할 수 없습니다."); setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("로그인이 필요합니다."); setLoading(false); return; }

      const [{ data: sessionData, error: sessionError }, { data: attemptData, error: attemptError }] = await Promise.all([
        supabase.from("mock_sessions").select("id,mode,evaluation_status,mock_set_number,score_json,created_at").eq("id", sessionId).single(),
        supabase.from("question_attempts").select("id,question_number,task_type,transcript,feature_json,score_json,evaluation_status,evaluation_error").eq("session_id", sessionId).order("question_number", { ascending: true }),
      ]);
      if (!active) return;
      if (sessionError || attemptError) setError(sessionError?.message ?? attemptError?.message ?? "결과를 불러오지 못했습니다.");
      else { setSession(sessionData as SessionRow); setAttempts((attemptData ?? []) as AttemptRow[]); }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [sessionId]);

  const total = useMemo(() => attempts.reduce((sum, attempt) => sum + (getNumber(attempt.score_json?.rawItemScore) ?? 0), 0), [attempts]);
  const maxTotal = useMemo(() => attempts.reduce((sum, attempt) => sum + (getNumber(attempt.score_json?.maxItemScore) ?? (attempt.question_number === 11 ? 5 : 3)), 0), [attempts]);

  if (loading) return <main className="result-page"><div className="dashboard-empty">결과를 불러오는 중…</div></main>;
  if (error || !session) return <main className="result-page"><div className="dashboard-empty"><b>{error || "기록을 찾을 수 없습니다."}</b><Link href="/dashboard">대시보드로 돌아가기</Link></div></main>;
  if (session.evaluation_status !== "evaluated") return <main className="result-page"><div className="dashboard-empty"><b>아직 평가가 완료되지 않았어요.</b><span>답변은 저장되어 있습니다. 평가가 끝나면 이 페이지에 결과가 표시됩니다.</span><Link href="/dashboard">대시보드로 돌아가기</Link></div></main>;

  return <main className="result-page">
    <header className="result-topbar"><Link href="/dashboard">← 내 학습 기록</Link><span>SPEAKING REVIEW</span></header>
    <section className="result-hero">
      <div><span>MOCK TEST</span><h1>{session.mode === "mock" ? `모의고사 ${session.mock_set_number ?? ""}` : "연습 결과"}</h1><p>{new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(session.created_at))}</p></div>
      <div className="raw-score"><span>말하기 평가</span><strong>{total}<small> / {maxTotal}</small></strong><p>학습을 위한 참고용 평가입니다.</p></div>
    </section>

    <section className="result-question-list">
      {attempts.map((attempt) => {
        const score = getNumber(attempt.score_json?.rawItemScore);
        const max = getNumber(attempt.score_json?.maxItemScore) ?? (attempt.question_number === 11 ? 5 : 3);
        const evidence = attempt.score_json?.evidence as Record<string, unknown> | undefined;
        const feedback = getString(evidence?.koreanFeedback);
        return <article className="result-question-card" key={attempt.id}>
          <div className="result-question-score"><span>Q{attempt.question_number}</span><strong>{score ?? "–"}<small>/{max}</small></strong></div>
          <div className="result-question-body">
            <span>{attempt.task_type.replaceAll("_", " ")}</span>
            {feedback && <p className="result-feedback">{feedback}</p>}
            {attempt.transcript && <details><summary>내 답변 기록</summary><p>{attempt.transcript}</p></details>}
            {attempt.evaluation_error && <p className="result-error">{attempt.evaluation_error}</p>}
          </div>
        </article>;
      })}
    </section>
  </main>;
}
