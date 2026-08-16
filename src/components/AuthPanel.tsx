"use client";
import { useEffect, useRef, useState } from "react";
import { getSupabase, hasSupabase } from "@/lib/supabase";

// Supabase returns these in English; the rest of the app is Korean-first.
function errorCopy(message: string) {
  if (/invalid login credentials/i.test(message)) return "이메일 또는 비밀번호가 올바르지 않아.";
  if (/email not confirmed/i.test(message)) return "아직 이메일 인증이 안 끝났어. 받은 메일의 링크를 먼저 눌러 줘.";
  if (/already registered/i.test(message)) return "이미 가입된 이메일이야. 로그인해 줘.";
  if (/at least 6 characters|password should be/i.test(message)) return "비밀번호는 6자 이상이어야 해.";
  // The 429 body reads "For security purposes, you can only request this after
  // N seconds." — no "rate limit" substring, so match the shape it actually has.
  if (/rate limit|too many|only request this after|security purposes/i.test(message)) {
    const seconds = message.match(/after (\d+) seconds?/i)?.[1];
    return seconds ? `잠깐, ${seconds}초 뒤에 다시 시도해 줘.` : "요청이 좀 많아. 잠시 후 다시 시도해 줘.";
  }
  return "처리하지 못했어. 잠시 후 다시 시도해 줘.";
}

// Returns a Korean message on failure, or null when the account now exists.
async function createAccount(email: string, password: string) {
  let response: Response;
  try {
    response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return "지금 서버에 연결할 수 없어. 잠시 후 다시 시도해 줘.";
  }
  if (response.ok) return null;
  const code = await response.json().then((body) => body?.error).catch(() => null);
  if (code === "email_exists") return "이미 가입된 이메일이야. 그냥 로그인하면 돼.";
  if (code === "weak_password") return "비밀번호는 6자 이상이어야 해.";
  if (code === "invalid_email") return "이메일 주소를 다시 확인해 줘.";
  if (code === "rate_limited") return "요청이 좀 많아. 잠시 후 다시 시도해 줘.";
  if (code === "not_configured") return "계정 기능이 아직 연결이 안 됐어. 이건 내 문제야.";
  return "계정을 만들지 못했어. 잠시 후 다시 시도해 줘.";
}

export default function AuthPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
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
    setMode("signin");
    dialogRef.current?.showModal();
  }

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setMessage("");
    setFailed(false);
  }

  function close() {
    dialogRef.current?.close();
  }

  async function submit(kind: "signin" | "signup") {
    const sb = getSupabase();
    if (!sb || busy) return;
    // Belt and braces: the form's required/minLength attributes cover the normal
    // path, but never let a click fall through to a silent no-op.
    if (!email || !password) {
      setFailed(true);
      setMessage("이메일이랑 비밀번호를 먼저 채워 줘.");
      return;
    }
    setBusy(true);
    setMessage("");
    setFailed(false);

    // Sign-up goes through our own route, which creates the account already
    // confirmed. Calling sb.auth.signUp here instead would leave the learner
    // waiting on a confirmation mail the project cannot actually deliver.
    if (kind === "signup") {
      const created = await createAccount(email, password);
      if (created) { setBusy(false); setFailed(true); setMessage(created); return; }
    }

    const { error } = await sb.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setFailed(true); setMessage(errorCopy(error.message)); return; }
    setPassword("");
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
        <p className="auth-dialog-intro">로그인하면 모의고사 기록이랑 평가 결과를 이어서 볼 수 있어.</p>

        {/* An explicit mode switch. "계정 만들기" used to be a small text link
            under the login button, so it read as a footnote rather than a choice. */}
        <div className="auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "active" : ""}
            onClick={() => switchMode("signin")}>로그인</button>
          <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""}
            onClick={() => switchMode("signup")}>회원가입</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); submit(mode); }}>
          <label className="auth-field">
            <span>이메일</span>
            <input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} />
          </label>
          <label className="auth-field">
            <span>비밀번호</span>
            <input type="password" minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required value={password} onChange={e=>setPassword(e.target.value)} />
            {mode === "signup" && <small className="auth-field-hint">6자 이상으로 정해 줘.</small>}
          </label>
          <button type="submit" className="button primary full" disabled={busy}>
            {busy ? "처리 중…" : mode === "signin" ? "로그인" : "계정 만들고 시작하기"}
          </button>
        </form>

        <p className="auth-dialog-switch">
          {mode === "signin"
            ? <>계정이 없어? <button type="button" className="text-button" onClick={() => switchMode("signup")}>회원가입</button></>
            : <>이미 계정이 있어? <button type="button" className="text-button" onClick={() => switchMode("signin")}>로그인</button></>}
        </p>

        {message && <p className={`auth-dialog-message ${failed ? "error" : ""}`}>{message}</p>}
      </div>
    </dialog>
  </>;
}
