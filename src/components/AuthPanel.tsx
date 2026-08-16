"use client";
import { useEffect, useState } from "react";
import { getSupabase, hasSupabase } from "@/lib/supabase";

export default function AuthPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const configured = hasSupabase();

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => setUserEmail(session?.user.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!configured) return <div className="connection-pill local">기록 저장 기능을 잠시 사용할 수 없습니다. 연습은 계속할 수 있어요.</div>;
  if (userEmail) return <div className="auth-row"><span className="connection-pill online">로그인됨 · {userEmail}</span><button className="text-button" onClick={() => getSupabase()?.auth.signOut()}>로그아웃</button></div>;

  async function submit(kind: "signin" | "signup") {
    const sb = getSupabase(); if (!sb) return;
    setMessage("");
    const result = kind === "signin"
      ? await sb.auth.signInWithPassword({ email, password })
      : await sb.auth.signUp({ email, password });
    setMessage(result.error ? "로그인 정보를 확인해 주세요." : kind === "signup" ? "계정이 생성되었습니다. 이메일 인증이 필요할 수 있어요." : "로그인되었습니다.");
  }

  return <div className="auth-box">
    <div><strong>내 기록 저장</strong><div className="muted small">로그인하면 모의고사 기록과 평가 결과를 이어서 확인할 수 있어요.</div></div>
    <input placeholder="이메일" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
    <input placeholder="비밀번호" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
    <button className="button secondary" onClick={()=>submit("signin")}>로그인</button>
    <button className="text-button" onClick={()=>submit("signup")}>계정 만들기</button>
    {message && <span className="muted small">{message}</span>}
  </div>;
}
