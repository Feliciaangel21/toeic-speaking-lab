"use client";
import { useEffect, useRef, useState } from "react";
import { getSupabase, hasSupabase } from "@/lib/supabase";

// Supabase returns these in English; the rest of the app is Korean-first.
function errorCopy(message: string) {
  if (/invalid login credentials/i.test(message)) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (/email not confirmed/i.test(message)) return "이메일 인증이 아직 완료되지 않았습니다. 받은 메일의 링크를 눌러 주세요.";
  if (/already registered/i.test(message)) return "이미 가입된 이메일입니다. 로그인해 주세요.";
  if (/at least 6 characters/i.test(message)) return "비밀번호는 6자 이상이어야 합니다.";
  if (/rate limit|too many/i.test(message)) return "요청이 많습니다. 잠시 후 다시 시도해 주세요.";
  return "처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export default function AuthPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const configured = hasSupabase();

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    // getSession reads the stored session locally; getUser would round-trip and
    // log a missing-session error on every visit by a signed-out learner.
    sb.auth.getSession().then(({ data }) => setUserEmail(data.session?.user.email ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => setUserEmail(session?.user.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  function open() {
    setMessage("");
    setFailed(false);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  async function submit(kind: "signin" | "signup") {
    const sb = getSupabase();
    if (!sb || busy || !email || !password) return;
    setBusy(true);
    setMessage("");
    setFailed(false);
    const result = kind === "signin"
      ? await sb.auth.signInWithPassword({ email, password })
      : await sb.auth.signUp({ email, password });
    setBusy(false);

    if (result.error) { setFailed(true); setMessage(errorCopy(result.error.message)); return; }
    setPassword("");
    // signUp returns no session when email confirmation is required.
    if (kind === "signup" && !result.data.session) {
      setMessage("확인 메일을 보냈습니다. 메일의 링크로 인증한 뒤 로그인해 주세요.");
      return;
    }
    close();
  }

  if (!configured) return <div className="connection-pill local">기록 저장 기능을 잠시 사용할 수 없습니다. 연습은 계속할 수 있어요.</div>;

  if (userEmail) return <div className="auth-row">
    <span className="connection-pill online">로그인됨 · {userEmail}</span>
    <button className="text-button" onClick={() => getSupabase()?.auth.signOut()}>로그아웃</button>
  </div>;

  return <>
    <button type="button" className="auth-trigger" onClick={open}>로그인</button>

    {/* Clicks land on the dialog element itself only when they hit the backdrop,
        because .auth-dialog has no padding and the body fills it. */}
    <dialog ref={dialogRef} className="auth-dialog" onClick={(e) => { if (e.target === dialogRef.current) close(); }}>
      <div className="auth-dialog-body">
        <button type="button" className="auth-dialog-close" onClick={close} aria-label="닫기">×</button>
        <h2>내 기록 저장</h2>
        <p className="auth-dialog-intro">로그인하면 모의고사 기록과 평가 결과를 이어서 확인할 수 있어요.</p>

        <form onSubmit={(e) => { e.preventDefault(); submit("signin"); }}>
          <label className="auth-field">
            <span>이메일</span>
            <input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} />
          </label>
          <label className="auth-field">
            <span>비밀번호</span>
            <input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} />
          </label>
          <button type="submit" className="button primary full" disabled={busy}>{busy ? "처리 중…" : "로그인"}</button>
          <button type="button" className="text-button center" disabled={busy} onClick={()=>submit("signup")}>계정 만들기</button>
        </form>

        {message && <p className={`auth-dialog-message ${failed ? "error" : ""}`}>{message}</p>}
      </div>
    </dialog>
  </>;
}
