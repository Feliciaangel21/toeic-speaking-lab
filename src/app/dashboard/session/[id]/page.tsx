"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, MessageSquareText, RefreshCcw, Timer, Volume2 } from "lucide-react";
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

type Correction = {
  original: string;
  corrected: string;
  category?: string;
  explanationKo?: string | null;
};

function getNumber(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function getString(value: unknown) { return typeof value === "string" ? value : null; }
function getStringArray(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function getCorrections(value: unknown): Correction[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const original = getString(row.original);
    const corrected = getString(row.corrected);
    if (!original || !corrected) return [];
    return [{
      original,
      corrected,
      category: getString(row.category) ?? undefined,
      explanationKo: getString(row.explanationKo),
    }];
  });
}
function pct(value: number | null) { return value === null ? null : Math.round(value * 100); }

function taskName(task: string) {
  return ({
    read_aloud: "Read a Text Aloud",
    describe_picture: "Describe a Picture",
    respond_questions: "Respond to Questions",
    info_response: "Use Information",
    opinion: "Express an Opinion",
  } as Record<string, string>)[task] ?? task.replaceAll("_", " ");
}

function coachLine(score: number | null, max: number) {
  if (score === null) return "평가값이 아직 없어.";
  const ratio = score / Math.max(max, 1);
  if (ratio >= .85) return "오, 이건 진짜 잘했어. 괜히 더 안 건드려도 돼.";
  if (ratio >= .65) return "생각보다 괜찮은데? 군더더기만 좀 줄이자.";
  if (ratio >= .45) return "핵심은 갔는데 중간에 좀 샜어. 아깝다.";
  return "일단 말은 했잖아. 그게 시작이야. 이제 답처럼 만들자.";
}

function sessionDimensions(scoreJson: Record<string, unknown> | null) {
  const raw = scoreJson?.dimensions;
  if (!raw || typeof raw !== "object") return [] as Array<{label:string;value:number}>;
  const dimensions = raw as Record<string, unknown>;
  const labels: Record<string, string> = {
    delivery: "전달력",
    grammar: "문법",
    vocabulary: "어휘",
    relevance: "관련성",
    content: "내용",
    pronunciation: "발음",
  };
  return Object.entries(dimensions).flatMap(([key, value]) => {
    if (!value || typeof value !== "object") return [];
    const normalized = getNumber((value as Record<string, unknown>).value);
    if (normalized === null) return [];
    return [{ label: labels[key] ?? key, value: normalized }];
  });
}

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
      if (!supabase) { setError("결과 저장 기능이 연결이 안 됐어. 이건 내 문제야."); setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("결과 보려면 로그인부터 해야지."); setLoading(false); return; }

      const [{ data: sessionData, error: sessionError }, { data: attemptData, error: attemptError }] = await Promise.all([
        supabase.from("mock_sessions").select("id,mode,evaluation_status,mock_set_number,score_json,created_at").eq("id", sessionId).single(),
        supabase.from("question_attempts").select("id,question_number,task_type,transcript,feature_json,score_json,evaluation_status,evaluation_error").eq("session_id", sessionId).order("question_number", { ascending: true }),
      ]);
      if (!active) return;
      if (sessionError || attemptError) setError(sessionError?.message ?? attemptError?.message ?? "결과를 못 불러왔어. 잠깐 뒤에 다시 와 봐.");
      else { setSession(sessionData as SessionRow); setAttempts((attemptData ?? []) as AttemptRow[]); }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [sessionId]);

  const total = useMemo(() => attempts.reduce((sum, attempt) => sum + (getNumber(attempt.score_json?.rawItemScore) ?? 0), 0), [attempts]);
  const maxTotal = useMemo(() => attempts.reduce((sum, attempt) => sum + (getNumber(attempt.score_json?.maxItemScore) ?? (attempt.question_number === 11 ? 5 : 3)), 0), [attempts]);
  const ratio = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
  const dimensions = useMemo(() => sessionDimensions(session?.score_json ?? null), [session]);

  if (loading) return <main className="result-page"><div className="dashboard-empty">결과 가져오는 중…</div></main>;
  if (error || !session) return <main className="result-page"><div className="dashboard-empty"><b>{error || "그런 기록이 없는데?"}</b><Link href="/dashboard">내 기록으로</Link></div></main>;
  if (session.evaluation_status !== "evaluated") return <main className="result-page"><div className="dashboard-empty"><b>아직 평가가 안 끝났어.</b><span>답변은 잘 저장돼 있으니까 걱정 마. 끝나면 여기 뜰 거야.</span><Link href="/dashboard">내 기록으로</Link></div></main>;

  return <main className="result-page redesign-result-page">
    <header className="result-topbar"><Link href="/dashboard">← 내 기록</Link><span>SPEAKING REVIEW</span></header>

    <section className="result-hero redesign-result-hero">
      <div>
        <span>{session.mode === "mock" ? "MOCK TEST" : "PRACTICE"}</span>
        <h1>{session.mode === "mock" ? `모의고사 ${session.mock_set_number ?? ""}` : `연습 세트 ${session.mock_set_number ?? ""}`}</h1>
        <p>{new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(session.created_at))}</p>
      </div>
      <div className="result-summary-center">
        <span>현재 raw ratio</span>
        <strong>{ratio}%</strong>
        <p>공식 TOEIC 환산 점수는 아니야. 현재 실험 평가기의 문항 점수 비율이야.</p>
      </div>
    </section>

    {dimensions.length > 0 && <section className="result-metric-grid">
      {dimensions.map((dimension) => <div key={dimension.label}><span>{dimension.label}</span><b>{pct(dimension.value)}%</b></div>)}
    </section>}

    <section className="result-question-list redesigned-question-list">
      {attempts.map((attempt) => {
        const score = getNumber(attempt.score_json?.rawItemScore);
        const max = getNumber(attempt.score_json?.maxItemScore) ?? (attempt.question_number === 11 ? 5 : 3);
        const evidence = attempt.score_json?.evidence as Record<string, unknown> | undefined;
        const features = (attempt.score_json?.features ?? attempt.feature_json ?? {}) as Record<string, unknown>;
        const feedback = getString(evidence?.koreanFeedback);
        const strengths = getStringArray(evidence?.strengths);
        const improvements = getStringArray(evidence?.improvements);
        const missingFacts = getStringArray(evidence?.missingFacts);
        const missingPoints = getStringArray(evidence?.missingPoints);
        const supportedPoints = getStringArray(evidence?.supportedPoints);
        const betterExpressions = getStringArray(evidence?.betterExpressions);
        const grammarCorrections = getCorrections(evidence?.grammarCorrections);
        const vocabularyIssues = getCorrections(evidence?.vocabularyIssues);
        const pronunciationStatus = getString(evidence?.pronunciationStatus);

        const wpm = getNumber(features.wpm);
        const pauseRatio = getNumber(features.pauseRatio);
        const completeness = getNumber(features.responseCompleteness) ?? getNumber(features.completeness);
        const relevance = getNumber(features.relevance);
        const factAccuracy = getNumber(features.factAccuracy);
        const delivery = getNumber(features.delivery);
        const development = getNumber(features.taskDevelopment) ?? getNumber(features.development);
        const grammar = getNumber(features.grammarAccuracy);
        const vocabulary = getNumber(features.vocabularyQuality);
        const clarity = getNumber(features.clarity);
        const conceptCoverage = getNumber(features.conceptCoverage);
        const pronunciation = getNumber(features.pronunciationTotal) ?? getNumber(features.pronunciationAccuracy);

        const metrics = [
          wpm === null ? null : { label: "속도", value: `${Math.round(wpm)} WPM` },
          pauseRatio === null ? null : { label: "쉼 비율", value: `${Math.round(pauseRatio * 100)}%` },
          pronunciation === null ? null : { label: "발음", value: `${pct(pronunciation)}%` },
          delivery === null ? null : { label: "딜리버리", value: `${pct(delivery)}%` },
          grammar === null ? null : { label: "문법", value: `${pct(grammar)}%` },
          vocabulary === null ? null : { label: "어휘", value: `${pct(vocabulary)}%` },
          clarity === null ? null : { label: "명확성", value: `${pct(clarity)}%` },
          relevance === null ? null : { label: "관련성", value: `${pct(relevance)}%` },
          completeness === null ? null : { label: "충실도", value: `${pct(completeness)}%` },
          conceptCoverage === null ? null : { label: "사진 핵심", value: `${pct(conceptCoverage)}%` },
          factAccuracy === null ? null : { label: "사실 정확도", value: `${pct(factAccuracy)}%` },
          development === null ? null : { label: "전개", value: `${pct(development)}%` },
        ].filter(Boolean) as Array<{label:string;value:string}>;

        const fixes = [
          ...improvements,
          ...missingFacts.map((x) => `놓친 정보: ${x}`),
          ...missingPoints.map((x) => `보완할 내용: ${x}`),
        ];

        return <article className="result-question-card redesigned-question-card" key={attempt.id}>
          <div className="question-result-head">
            <div className="result-question-score"><span>Q{attempt.question_number}</span><strong>{score ?? "–"}<small>/{max}</small></strong></div>
            <div><span>{taskName(attempt.task_type)}</span><h2>{coachLine(score, max)}</h2></div>
          </div>

          {metrics.length > 0 && <div className="result-metric-grid">{metrics.map((metric)=><div key={metric.label}><span>{metric.label}</span><b>{metric.value}</b></div>)}</div>}

          {pronunciationStatus === "unavailable" && attempt.task_type === "read_aloud" && <p className="result-error">발음 전용 모델은 아직 연결되지 않았어. 현재 Q1–2 점수는 낭독 정확도 + 전달력 기반 실험값이야.</p>}

          <div className="result-feedback-grid">
            <section>
              <div className="result-section-title"><MessageSquareText size={17}/><b>AI 피드백</b></div>
              <p>{feedback || "이 문항은 한국어 피드백이 따로 안 나왔어. 아래 지표랑 네 답변 기록부터 확인해 봐."}</p>
            </section>

            <section>
              <div className="result-section-title"><RefreshCcw size={17}/><b>다음에 고칠 것</b></div>
              {fixes.length > 0
                ? <ul>{fixes.map((item, index)=><li key={`${item}-${index}`}>{item}</li>)}</ul>
                : <p>크게 잡힌 문제는 없어. 잘했다는 뜻이야. 그래도 답이 짧았다면 한 문장만 더 붙여 보자.</p>}
            </section>
          </div>

          {grammarCorrections.length > 0 && <section className="result-transcript">
            <div className="result-section-title"><b>문법 교정</b></div>
            {grammarCorrections.map((item, index) => <div key={`${item.original}-${index}`}>
              <p><s>{item.original}</s> → <b>{item.corrected}</b></p>
              {item.explanationKo && <small>{item.explanationKo}</small>}
            </div>)}
          </section>}

          {vocabularyIssues.length > 0 && <section className="result-transcript">
            <div className="result-section-title"><b>어휘 / 표현</b></div>
            {vocabularyIssues.map((item, index) => <div key={`${item.original}-${index}`}>
              <p><s>{item.original}</s> → <b>{item.corrected}</b></p>
              {item.explanationKo && <small>{item.explanationKo}</small>}
            </div>)}
          </section>}

          {betterExpressions.length > 0 && <div className="result-strengths"><b>바로 써먹을 표현</b>{betterExpressions.map((item)=><span key={item}>→ {item}</span>)}</div>}
          {supportedPoints.length > 0 && <div className="result-strengths"><b>잡은 핵심</b>{supportedPoints.map((item)=><span key={item}>✓ {item}</span>)}</div>}
          {strengths.length > 0 && <div className="result-strengths"><b>잘한 점</b>{strengths.map((item)=><span key={item}>✓ {item}</span>)}</div>}

          {attempt.transcript && <details className="result-transcript"><summary><Volume2 size={16}/> 내 답변 텍스트 보기</summary><p>{attempt.transcript}</p></details>}
          {attempt.evaluation_error && <p className="result-error">{attempt.evaluation_error}</p>}

          <div className="result-card-actions">
            <Link href={`/practice?set=${session.mock_set_number ?? 1}`}>같은 세트 연습으로 다시 보기 <ArrowRight size={15}/></Link>
          </div>
        </article>;
      })}
    </section>

    <section className="result-next-actions">
      <div><Timer size={18}/><span><b>여기서 끝내면 아깝잖아.</b><small>방금 약했던 유형만 한 번 더. 그거면 충분해.</small></span></div>
      <Link href={`/practice?set=${session.mock_set_number ?? 1}`}>다시 연습하기 <ArrowRight size={16}/></Link>
    </section>
  </main>;
}
