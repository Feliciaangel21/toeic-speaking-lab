import Link from "next/link";
import AuthPanel from "@/components/AuthPanel";

const mockSets = Array.from({ length: 15 }, (_, index) => index + 1);
const practiceSets = Array.from({ length: 15 }, (_, index) => index + 1);

export default function Home() {
  return (
    <main className="study-home">
      <header className="study-nav">
        <Link href="/" className="study-brand" aria-label="Speaking Lab 홈">
          <span className="study-brand-mark">S</span>
          <span>
            <b>Speaking Lab</b>
            <small>TOEIC Speaking Practice</small>
          </span>
        </Link>

        <div className="study-nav-actions">
          <Link href="/dashboard" className="study-history-link">내 기록</Link>
          <details className="home-auth">
            <summary>로그인</summary>
            <div className="home-auth-panel">
              <AuthPanel />
            </div>
          </details>
        </div>
      </header>

      <section className="study-hero">
        <div className="study-hero-copy">
          <p className="study-kicker">오늘의 스피킹 연습</p>
          <h1>
            토익 스피킹,
            <br />
            시험처럼 연습해요.
          </h1>
          <p className="study-intro">
            15개 실전 모의고사와 15개 연습 세트를 내 페이스대로 준비해 보세요.
          </p>
        </div>

        <div className="study-mode-grid" aria-label="연습 모드 선택">
          <article className="study-mode-card mock-card">
            <div className="study-mode-topline">
              <span>MOCK TEST</span>
              <span>약 20분</span>
            </div>
            <div>
              <h2>실전 모의고사</h2>
              <p>11문항을 실제 시험 흐름과 시간에 맞춰 한 번에 연습해요.</p>
            </div>
            <Link className="study-card-action primary" href="/test?set=1">
              모의고사 시작 <span aria-hidden="true">→</span>
            </Link>
          </article>

          <article className="study-mode-card practice-card">
            <div className="study-mode-topline">
              <span>PRACTICE</span>
              <span>내 페이스대로</span>
            </div>
            <div>
              <h2>연습 세트</h2>
              <p>15개 연습 세트에서 답변 후 힌트, 표현, 해설과 모범 답변을 확인하며 천천히 연습해요.</p>
            </div>
            <Link className="study-card-action secondary" href="/practice?set=1">
              연습 세트 선택 <span aria-hidden="true">→</span>
            </Link>
          </article>
        </div>

        <div className="study-meta-row" aria-label="시험 구성 요약">
          <span>11문항</span>
          <i />
          <span>약 20분</span>
          <i />
          <span>5개 유형</span>
        </div>

        <details className="mock-picker">
          <summary>다른 모의고사 세트 선택</summary>
          <div className="mock-picker-grid">
            {mockSets.map((set) => (
              <Link key={set} href={`/test?set=${set}`}>
                {String(set).padStart(2, "0")}
              </Link>
            ))}
          </div>
        </details>

        <details className="mock-picker practice-home-picker">
          <summary>연습 세트 선택</summary>
          <div className="mock-picker-grid">
            {practiceSets.map((set) => (
              <Link key={set} href={`/practice?set=${set}`}>
                {String(set).padStart(2, "0")}
              </Link>
            ))}
          </div>
        </details>
      </section>

      <footer className="study-footer">
        <span>Independent TOEIC-style speaking practice.</span>
        <span>TOEIC is a registered trademark of ETS.</span>
      </footer>
    </main>
  );
}
