"use client";
import { BookOpen, ChevronDown, Lightbulb, Target, Volume2 } from "lucide-react";
import type { Question } from "@/lib/types";
import { getPracticeHelp } from "@/lib/practice-help";

export default function PracticeCoach({question, allowSample, onListen}:{question:Question; allowSample:boolean; onListen?:(text:string)=>void}) {
  const h=getPracticeHelp(question);
  const sampleWords=h.sampleAnswer.trim().split(/\s+/).filter(Boolean).length;
  const estimatedSeconds=Math.max(1, Math.round((sampleWords/125)*60));

  return <details className="coach-panel coach-collapsed redesigned-coach" aria-label="한국어 학습 가이드">
    <summary className="coach-heading"><div><span className="coach-eyebrow">{allowSample ? "ANSWER REVIEW" : "PRACTICE HELP"}</span><h3>{allowSample ? "말했으면 이제 같이 뜯어보자." : "막히면 여기 봐. 봐도 돼."}</h3></div><ChevronDown size={20}/></summary>
    <div className="coach-content">
      <details className="coach-detail">
        <summary><Lightbulb size={17}/><b>힌트</b><span className="summary-note">정답은 안 줘. 방향만.</span><ChevronDown size={16}/></summary>
        <div className="coach-body"><p>{h.hint}</p><div className="guide-chips">{h.guideWords.map(w=><span key={w}>{w}</span>)}</div></div>
      </details>

      <details className="coach-detail">
        <summary><BookOpen size={17}/><b>답변 틀</b><span className="summary-note">머리 하얘지면 이 순서대로</span><ChevronDown size={16}/></summary>
        <div className="coach-body"><ol>{h.structure.map(s=><li key={s}>{s}</li>)}</ol></div>
      </details>

      <details className="coach-detail">
        <summary><Target size={17}/><b>뭘 보고 채점하냐면</b><span className="summary-note">알고 하면 훨씬 나아</span><ChevronDown size={16}/></summary>
        <div className="coach-body"><p>{h.why}</p><div className="official-box"><b>공개 평가 기준이랑 연결되는 포인트</b><ul>{h.officialFocus.map(f=><li key={f}>{f}</li>)}</ul></div><small>※ ETS 공개 핸드북의 평가 기준을 학습용으로 요약한 거야. 여기 모범 답변은 ETS 공식 답안은 아니야.</small></div>
      </details>

      <details className={`coach-detail sample ${allowSample?"":"locked"}`}>
        <summary><BookOpen size={17}/><b>{question.taskType==="read_aloud"?"모범 읽기":"모범 답변"}</b><span className="summary-note">{allowSample?"이제 비교해도 돼":"네가 먼저 말하고 나서"}</span><ChevronDown size={16}/></summary>
        <div className="coach-body">
          {allowSample ? <><div className="sample-meta">예상 발화 약 {estimatedSeconds}초 · 시험 응답 {question.responseSeconds}초</div><p className={question.taskType==="read_aloud"?"sample-passage":"sample-answer"}>{h.sampleAnswer}</p>{h.coachNote&&<p className="coach-note"><b>한마디:</b> {h.coachNote}</p>}{onListen&&<button className="button secondary coach-listen-button" onClick={()=>onListen(h.sampleAnswer)}><Volume2 size={16}/> 브라우저 음성으로 들어보기</button>}</> : <p className="locked-copy">답변부터 하고 와. 보고 따라 읽는 건 연습이 아니잖아. 못해도 되니까 일단 말해 봐.</p>}
        </div>
      </details>
    </div>
  </details>;
}
