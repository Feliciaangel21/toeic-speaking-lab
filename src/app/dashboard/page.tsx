"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";

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
  pending: { label: "평가 대기 중", detail: "답변이 안전하게 저장되었습니다." },
  processing: { label: "평가 중", detail: "답변을 분석하고 있어요." },
  evaluated: { label: "평가 완료", detail: "결과를 확인할 수 있어요." },
  failed: { label: "평가 확인 필요", detail: "일부 답변 평가에 문제가 생겼어요." },
  not_requested: { label: "저장 완료", detail: "녹음 없이 진행한 연습 기록이에요." },
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
        if (active) { setMessage("기록 저장 기능에 연결할 수 없습니다."); setLoading(false); }
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) { setMessage("아직 서버에 저장된 결과가 없습니다. 연습 기록은 이 기기에 저장됩니다."); setLoading(false); }
        return;
      }
      const { data, error } = await supabase
        .from("mock_sessions")
        .select("id,mode,status,evaluation_status,mock_set_number,estimated_score,score_json,created_at")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) setMessage("학습 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      else setSessions((data ?? []) as SessionRow[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const mockCount = useMemo(() => sessions.filter((session) => session.mode === "mock").length, [sessions]);

  return <main className="student-dashboard">
    <header className="dashboard-header">
      <Link href="/" className="dashboard-brand">SPEAKING LAB</Link>
      <div className="dashboard-header-actions">
        <Link href="/practice?set=1">연습하기</Link>
        <Link href="/test?set=1" className="dashboard-start">모의고사 시작</Link>
      </div>
    </header>

    <section className="dashboard-intro">
      <span>MY SPEAKING</span>
      <h1>내 학습 기록</h1>
      <p>답변은 먼저 저장되고, 평가가 끝난 기록부터 결과를 확인할 수 있어요.</p>
    </section>

    <section className="dashboard-list-wrap">
      <div className="dashboard-list-heading">
        <div><b>최근 기록</b><span>{mockCount > 0 ? `모의고사 ${mockCount}회` : "아직 모의고사 기록이 없어요"}</span></div>
      </div>

      {loading && <div className="dashboard-empty">기록을 불러오는 중…</div>}
      {!loading && message && <div className="dashboard-empty"><b>{message}</b><Link href="/practice?set=1">연습 시작하기</Link></div>}
      {!loading && !message && sessions.length === 0 && <div className="dashboard-empty"><b>아직 저장된 기록이 없어요.</b><span>첫 모의고사를 완료하면 여기에 표시됩니다.</span><Link href="/test?set=1">모의고사 시작</Link></div>}

      {!loading && !message && sessions.map((session, index) => {
        const state = STATUS_COPY[session.evaluation_status] ?? STATUS_COPY.pending;
        return <article className="dashboard-session-card" key={session.id}>
          <div className="session-date">{new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(session.created_at))}</div>
          <div className="session-main">
            <span>{session.mode === "mock" ? "MOCK TEST" : "PRACTICE"}</span>
            <h2>{sessionTitle(session, index)}</h2>
            <p>{state.detail}</p>
          </div>
          <div className={`session-state state-${session.evaluation_status}`}>{state.label}</div>
          <div className="session-action">
            {session.evaluation_status === "evaluated"
              ? <Link href={`/dashboard/session/${session.id}`}>결과 보기 →</Link>
              : <span>{session.evaluation_status === "processing" ? "조금만 기다려 주세요" : "결과 준비 중"}</span>}
          </div>
        </article>;
      })}
    </section>
  </main>;
}
