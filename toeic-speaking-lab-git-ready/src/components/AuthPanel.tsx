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

  if (!configured) return <div className="connection-pill local">Local mode · add Supabase env vars to sync</div>;
  if (userEmail) return <div className="auth-row"><span className="connection-pill online">Synced · {userEmail}</span><button className="text-button" onClick={() => getSupabase()?.auth.signOut()}>Sign out</button></div>;

  async function submit(kind: "signin" | "signup") {
    const sb = getSupabase(); if (!sb) return;
    setMessage("");
    const result = kind === "signin"
      ? await sb.auth.signInWithPassword({ email, password })
      : await sb.auth.signUp({ email, password });
    setMessage(result.error ? result.error.message : kind === "signup" ? "Account created. Check email if confirmation is enabled." : "Signed in.");
  }

  return <div className="auth-box">
    <div><strong>Optional sync</strong><div className="muted small">Sign in to save attempts to Supabase. You can also practice locally.</div></div>
    <input placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
    <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
    <button className="button secondary" onClick={()=>submit("signin")}>Sign in</button>
    <button className="text-button" onClick={()=>submit("signup")}>Create account</button>
    {message && <span className="muted small">{message}</span>}
  </div>;
}
