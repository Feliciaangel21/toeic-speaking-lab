"use client";
import { BookOpen, ChevronDown, Lightbulb, Target } from "lucide-react";
import type { Question } from "@/lib/types";
import { getPracticeHelp } from "@/lib/practice-help";

export default function PracticeCoach({question, allowSample, onListen}:{question:Question; allowSample:boolean; onListen?:(text:string)=>void}){
  const h=getPracticeHelp(question);
  const sampleWords=h.sampleAnswer.trim().split(/\s+/).filter(Boolean).length;
  const estimatedSeconds=Math.max(1, Math.round((sampleWords/125)*60));
  return <details className="coach-panel coach-collapsed" aria-label="한국어 학습 가이드">
    <summary className="coach-heading"><div><h3>{allowSample ? "해설 및 모범 답변" : "힌트"}</h3></div><ChevronDown size={20}/></summary>
    <div className="coach-content">
    <details className="coach-detail">
      <summary><Lightbulb size={17}/><b>힌트</b><ChevronDown size={16}/></summary>
      <div className="coach-body"><p>{h.hint}</p><div className="guide-chips">{h.guideWords.map(w=><span key={w}>{w}</span>)}</div></div>
    </details>

    <details className="coach-detail">
      <summary><BookOpen size={17}/><b>답변 틀</b><ChevronDown size={16}/></summary>
      <div className="coach-body"><ol>{h.structure.map(s=><li key={s}>{s}</li>)}</ol></div>
    </details>

    <details className="coach-detail">
      <summary><Target size={17}/><b>왜 이렇게 답해야 하나요?</b><ChevronDown size={16}/></summary>
      <div className="coach-body"><p>{h.why}</p><div className="official-box"><b>ETS 공개 채점 기준과 연결</b><ul>{h.officialFocus.map(f=><li key={f}>{f}</li>)}</ul></div><small>※ ETS 공개 핸드북의 평가 기준을 학습용으로 요약한 설명이며, 이 사이트의 모범답변은 ETS 공식 답안이 아닙니다.</small></div>
    </details>

    <details className={`coach-detail sample ${allowSample?"":"locked"}`}>
      <summary><BookOpen size={17}/><b>{question.taskType==="read_aloud"?"모범 읽기":"모범 답변"}</b><span className="summary-note">{allowSample?"답변 후 확인":"먼저 직접 답해 보세요"}</span><ChevronDown size={16}/></summary>
      <div className="coach-body">
        {allowSample ? <><div className="sample-meta">예상 발화 시간 약 {estimatedSeconds}초 · 시험 응답 시간 {question.responseSeconds}초</div><p className={question.taskType==="read_aloud"?"sample-passage":"sample-answer"}>{h.sampleAnswer}</p>{h.coachNote&&<p className="coach-note">{h.coachNote}</p>}{question.taskType==="read_aloud"&&onListen&&<button className="button secondary" onClick={()=>onListen(h.sampleAnswer)}>브라우저 음성으로 들어보기</button>}</> : <p className="locked-copy">답변을 마친 뒤 확인할 수 있습니다.</p>}
      </div>
    </details>
    </div>
  </details>;
}
