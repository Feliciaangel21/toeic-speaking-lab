import Link from "next/link";
import AuthPanel from "@/components/AuthPanel";
import { Headphones, Mic2, TimerReset, Database, ShieldCheck } from "lucide-react";

export default function Home() {
  return <main className="home-shell">
    <header className="topbar"><div className="brand-mark">SL</div><div><b>Speaking Lab</b><span>Exam-style English speaking practice</span></div></header>
    <section className="hero">
      <div className="eyebrow">FULL SPEAKING SIMULATION</div>
      <h1>Practice the pressure, not just the English.</h1>
      <p>A strict 11-question TOEIC-style speaking simulator with official-format timings, automatic recording, and a pre-generated bank that does not spend LLM tokens while you practice.</p>
      <div className="hero-actions"><Link className="button primary large" href="/test?set=1">Start mock test 1</Link><Link className="button practice large" href="/practice">연습 모드 · 한국어 가이드</Link><a className="button ghost large" href="#bank">See question bank</a></div>
      <p className="legal-note">Independent practice simulator. Not affiliated with or endorsed by ETS. TOEIC is a registered trademark of ETS.</p>
    </section>
    <section className="stats-grid" id="bank">
      <div className="stat"><b>11</b><span>questions per mock</span></div><div className="stat"><b>~20</b><span>minutes</span></div><div className="stat"><b>170</b><span>question opportunities</span></div><div className="stat"><b>$0</b><span>runtime AI required</span></div>
    </section>
    <section className="feature-grid">
      <article><TimerReset/><h3>Exact task timing</h3><p>Preparation and response clocks follow the current speaking-task format.</p></article>
      <article><Mic2/><h3>Automatic recording</h3><p>Mock mode uses timed recording. Practice mode also supports a microphone-free timed speaking drill.</p></article>
      <article><Headphones/><h3>Browser narration</h3><p>Questions can be read with local speech synthesis, including a repeated Question 10.</p></article>
      <article><Database/><h3>Supabase ready</h3><p>Schema, RLS and attempt persistence are included. Without credentials it automatically falls back to local storage.</p></article>
      <article><ShieldCheck/><h3>No score pretending</h3><p>The scoring boundary is included but returns no fake score until you connect a validated model.</p></article>
    </section>
    <section className="setup-card"><h2>15 non-repeating mock tests</h2><p>Each set has its own 11 question IDs with no cross-set reuse.</p><div className="mock-set-grid">{Array.from({length:15},(_,i)=><Link key={i} className="button ghost" href={`/test?set=${i+1}`}>Mock {i+1}</Link>)}</div></section><section className="setup-card"><h2>Data sync</h2><AuthPanel/></section>
  </main>;
}
