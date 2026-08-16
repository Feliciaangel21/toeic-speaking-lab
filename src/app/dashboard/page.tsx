"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, Clock3, Flame, Target } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import StudyBuddy from "@/components/StudyBuddy";

type SessionRow = {
  id: string;
  mode: "mock" | "practice";
  status: string;
  evaluation_status: "pending" | "processing" | "evaluated" | "failed" | "not_requested";
  mock_set_number: number | null;
  estimated_score: number | null;
  score_json: Record<string, unknown> | null;
  created_at: string;
};

const STATUS_COPY: Record<SessionRow["evaluation_status"], { label: string; detail: string }> = {
  pending: { label: "평가 대기 중", detail: "답변은 잘 저장됐어. 이제 차례 기다리는 중." },
  processing: { label: "평가 중", detail: "지금 하나하나 뜯어보는 중이야. 잠깐만." },
  evaluated: { label: "평가 완료", detail: "다 나왔어. 도망가지 말고 확인해." },
  failed: { label: "평가 확인 필요", detail: "일부 답변에서 문제가 생겼어. 네 잘못은 아니고, 기록은 남아 있어." },
  not_requested: { label: "저장 완료", detail: "녹음 없이 한 연습이야. 이것도 한 거야." },
};

function sessionTitle(session: SessionRow, index: number) {
  if (session.mode === "mock") return `모의고사 ${session.mock_set_number ?? index + 1}`;
  return `연습 세트 ${session.mock_set_number ?? index + 1}`;
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = getSupabase();
      if (!supabase) {
        if (active) { setMessage("기록 저장 기능이 아직 연결이 안 됐어. 이건 내 문제야."); setLoading(false); }
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) { setMessage("결과 보려면 로그인부터 해야지."); setLoading(false); }
        return;
      }
      const { data, error } = await supabase
        .from("mock_sessions")
        .select("id,mode,status,evaluation_status,mock_set_number,estimated_score,score_json,created_at")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) setMessage("기록 불러오다 막혔어. 잠깐 뒤에 다시 와 봐.");
      else setSessions((data ?? []) as SessionRow[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const mockCount = useMemo(() => sessions.filter((session) => session.mode === "mock").length, [sessions]);
  const practiceCount = useMemo(() => sessions.filter((session) => session.mode === "practice").length, [sessions]);
  const evaluated = useMemo(() => sessions.filter((session) => session.evaluation_status === "evaluated"), [sessions]);
  const latestScore = useMemo(() => {
    for (const session of evaluated) {
      if (typeof session.estimated_score === "number") return session.estimated_score;
    }
    return null;
  }, [evaluated]);

  return <main className="student-dashboard redesign-dashboard">
    <header className="dashboard-header">
      <Link href="/" className="dashboard-brand">SPEAKING LAB</Link>
      <div className="dashboard-header-actions">
        <Link href="/practice?set=1">연습하기</Link>
        <Link href="/test?set=1" className="dashboard-start">모의고사 시작</Link>
      </div>
    </header>

    <section className="dashboard-intro redesign-dashboard-intro">
      <div>
        <span>MY SPEAKING</span>
        <h1>내 기록</h1>
        <p>기록은 거짓말 안 해. 그래서 좀 찔릴 수도 있는데, 그만큼 늘었다는 뜻이기도 해.</p>
      </div>
    </section>

    <section className="dashboard-summary-grid">
      <article><Target size={19}/><span>평가 완료</span><strong>{evaluated.length}<small>개</small></strong></article>
      <article><BarChart3 size={19}/><span>최근 예상 점수</span><strong>{latestScore ?? "–"}<small>{latestScore === null ? "" : "점"}</small></strong></article>
      <article><Flame size={19}/><span>모의고사</span><strong>{mockCount}<small>회</small></strong></article>
      <article><Clock3 size={19}/><span>연습 세트</span><strong>{practiceCount}<small>회</small></strong></article>
    </section>

    <section className="dashboard-list-wrap">
      <div className="dashboard-list-heading">
        <div><b>최근 기록</b><span>{sessions.length ? `${sessions.length}개 쌓였어. 나쁘지 않은데?` : "아직 텅 비었어."}</span></div>
        <Link href="/practice?set=1">오늘 하나 채우자 <ArrowRight size={15}/></Link>
      </div>

      {loading && <div className="dashboard-empty">기록 가져오는 중…</div>}
      {!loading && message && <div className="dashboard-empty"><b>{message}</b><Link href="/">홈으로</Link></div>}
      {!loading && !message && sessions.length === 0 && <div className="dashboard-empty dashboard-empty-buddy"><StudyBuddy mood="peek" size={110}/><div><b>아직 보여줄 게 없네.</b><span>틀린 게 없는 게 아니라 아직 시작을 안 한 거야. 한 세트면 충분해.</span><Link href="/practice?set=1">지금 한 세트 하고 와 →</Link></div></div>}

      {!loading && !message && sessions.map((session, index) => {
        const state = STATUS_COPY[session.evaluation_status] ?? STATUS_COPY.pending;
        const raw = session.score_json?.rawTotal;
        const max = session.score_json?.maxTotal;
        const ratio = typeof raw === "number" && typeof max === "number" && max > 0 ? Math.round((raw / max) * 100) : null;
        return <article className="dashboard-session-card" key={session.id}>
          <div className="session-date">{new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(session.created_at))}</div>
          <div className="session-main">
            <span>{session.mode === "mock" ? "MOCK TEST" : "PRACTICE"}</span>
            <h2>{sessionTitle(session, index)}</h2>
            <p>{state.detail}</p>
          </div>
          <div className="session-score-mini">{typeof session.estimated_score === "number" ? session.estimated_score : (ratio === null ? "–" : `${ratio}%`)}<small>{typeof session.estimated_score === "number" ? "experimental" : "raw ratio"}</small></div>
          <div className={`session-state state-${session.evaluation_status}`}>{state.label}</div>
          <div className="session-action">
            {session.evaluation_status === "evaluated"
              ? <Link href={`/dashboard/session/${session.id}`}>결과 보기 →</Link>
              : <span>{session.evaluation_status === "processing" ? "조금만 기다려 봐." : "결과 준비 중"}</span>}
          </div>
        </article>;
      })}
    </section>
  </main>;
}
