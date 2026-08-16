import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Gauge,
  Headphones,
  Mic2,
  RefreshCcw,
  Timer,
  WandSparkles,
} from "lucide-react";
import AuthPanel from "@/components/AuthPanel";
import StudyBuddy from "@/components/StudyBuddy";

const mockSets = Array.from({ length: 15 }, (_, index) => index + 1);
const practiceSets = Array.from({ length: 15 }, (_, index) => index + 1);

const featureCards = [
  { icon: Gauge, title: "AI 답변 분석", copy: "점수만 보고 창 닫지 마. 이유가 밑에 있어." },
  { icon: BarChart3, title: "유창성 · 속도 · 쉼", copy: "어디서 멈칫했는지 다 찍혀. 민망해도 봐." },
  { icon: WandSparkles, title: "한국어 피드백", copy: "잘한 건 잘했다고, 못한 건 딱 집어서." },
  { icon: Headphones, title: "모범 답변", copy: "네 답이랑 비교해 봐. 생각보다 안 멀어." },
  { icon: RefreshCcw, title: "다시 말하기", copy: "한 번 더 해. 그게 제일 빠른 길이야." },
];

export default function Home() {
  return (
    <main className="study-home redesign-home">
      <header className="study-nav redesign-nav">
        <Link href="/" className="study-brand" aria-label="Speaking Lab 홈">
          <span className="study-brand-mark">S</span>
          <span>
            <b>Speaking Lab</b>
            <small>TOEIC Speaking Practice</small>
          </span>
        </Link>

        <div className="study-nav-actions">
          <Link href="/dashboard" className="study-history-link">내 기록</Link>
          <AuthPanel />
        </div>
      </header>

      <section className="redesign-hero">
        <div className="redesign-hero-copy">
          <p className="study-kicker handwritten-kicker">오늘의 스피킹 연습</p>
          <h1>
            토익 스피킹,
            <br />
            시험처럼 <span className="hero-emphasis">제대로</span> 연습해.
          </h1>
          <p className="redesign-subcopy">또 미뤘지. 알아. 그래도 20분이면 한 세트 끝나니까 지금 하자.</p>

          <div className="redesign-goal-row" aria-label="오늘 학습 요약">
            <div><Mic2 size={20} /><span><small>오늘 목표</small><b>1세트 끝내기</b></span></div>
            <div><Timer size={20} /><span><small>예상 시간</small><b>약 20분</b></span></div>
            <div><BookOpen size={20} /><span><small>문항 수</small><b>11문항</b></span></div>
          </div>
        </div>

        <div className="redesign-buddy-stage">
          <StudyBuddy size={230} />
          <div className="buddy-note">
            <span>대충 하면</span>
            <b>다 티 나.</b>
            <small>알지?</small>
          </div>
        </div>
      </section>

      <section className="study-mode-grid redesign-mode-grid" aria-label="연습 모드 선택">
        <article className="study-mode-card mock-card redesign-mode-card redesign-mock-card">
          <div className="redesign-card-hero">
            <div>
              <div className="study-mode-topline">
                <span>MOCK TEST</span>
                <span>세트 {mockSets.length}개 · 약 20분</span>
              </div>
              <h2>실전 모의고사</h2>
              <p>실제 시험 순서랑 시간 그대로. 힌트 없고 멈춤 없어. 한 번에 끝까지 가.</p>
            </div>
            <div className="target-visual" aria-hidden="true"><i /><i /><i /><b>↘</b></div>
          </div>

          <div className="mode-feature-row">
            <span>11문항</span><span>실전 타이밍</span><span>자동 녹음</span><span>끝난 뒤 평가</span>
          </div>

          <div className="set-block">
            <div className="set-block-head">
              <b>세트 선택</b>
              <span>고민 그만하고 하나 골라. 어차피 다 풀 거잖아.</span>
            </div>
            <div className="set-grid">
              {mockSets.map((set) => (
                <Link key={set} href={`/test?set=${set}`} aria-label={`모의고사 ${set}번 세트 시작`}>
                  {String(set).padStart(2, "0")}
                </Link>
              ))}
            </div>
          </div>

          <div className="card-action-row">
            <Link className="study-card-action primary" href="/test?set=1">
              1번 세트로 시작 <ArrowRight size={17} />
            </Link>
            <span className="handwritten-mini">중간에 끄기 없기. 끝나고 얘기하자.</span>
          </div>
        </article>

        <article className="study-mode-card practice-card redesign-mode-card redesign-practice-card">
          <div className="redesign-card-hero">
            <div>
              <div className="study-mode-topline">
                <span>PRACTICE</span>
                <span>세트 {practiceSets.length}개 · 내 페이스대로</span>
              </div>
              <h2>연습 세트</h2>
              <p>힌트 보고, 구조 잡고, 답한 뒤 해설이랑 모범 답변까지 확인해. 여기선 틀려도 돼.</p>
            </div>
          </div>

          <div className="mode-feature-row">
            <span>힌트</span><span>답변 틀</span><span>해설</span><span>모범 답변</span><span>다시 풀기</span>
          </div>

          <div className="set-block">
            <div className="set-block-head">
              <b>세트 선택</b>
              <span>막히면 힌트 봐. 그건 반칙 아니야.</span>
            </div>
            <div className="set-grid">
              {practiceSets.map((set) => (
                <Link key={set} href={`/practice?set=${set}`} aria-label={`연습 ${set}번 세트 시작`}>
                  {String(set).padStart(2, "0")}
                </Link>
              ))}
            </div>
          </div>

          <div className="card-action-row">
            <Link className="study-card-action secondary" href="/practice?set=1">
              1번 세트로 시작 <ArrowRight size={17} />
            </Link>
            <span className="handwritten-mini">틀린 건 바로 고치면 그만이야.</span>
          </div>
        </article>
      </section>

      <section className="redesign-feature-strip" aria-label="학습 기능">
        {featureCards.map(({ icon: Icon, title, copy }) => (
          <article key={title}>
            <Icon size={21} />
            <div><b>{title}</b><span>{copy}</span></div>
            <ArrowRight size={16} />
          </article>
        ))}
      </section>

      <footer className="study-footer redesign-footer">
        <span>Independent TOEIC-style speaking practice.</span>
      </footer>
    </main>
  );
}
