"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Question, RecordedAttempt } from "@/lib/types";
import type { PracticeHelp } from "@/components/PracticeCoach";
import { saveMockSession } from "@/lib/save-attempt";
import { getSupabase, hasSupabase } from "@/lib/supabase";
import PracticeCoach from "@/components/PracticeCoach";
import { Mic, Volume2, CheckCircle2, ArrowRight, RotateCcw, SkipForward } from "lucide-react";

type Phase = "study" | "narrating" | "prep" | "recording" | "review" | "done";
type RunnerMode = "mock" | "practice";
type PracticeCaptureMode = "record" | "no_record";

function formatTime(sec:number){ return `00:${String(Math.max(0,sec)).padStart(2,"0")}`; }
function taskLabel(q:Question){ return ({read_aloud:"Read a text aloud",describe_picture:"Describe a picture",respond_questions:"Respond to questions",info_response:"Use information provided",opinion:"Express an opinion"} as const)[q.taskType]; }

function splitInfoValue(value:string){
  return value.split(/\s+(?:—|·)\s+/).map(x=>x.trim()).filter(Boolean);
}

function infoTableSpec(title:string){
  const t=title.toLowerCase();
  if(t.includes("meeting room")) return ["Room", "Availability", "Capacity", "Rate"];
  if(t.includes("cooking school") || t.includes("culinary school")) return ["Time", "Class", "Instructor / Kitchen", "Fee"];
  if(t.includes("fitness")) return ["Time", "Class", "Location", "Instructor"];
  if(t.includes("science museum")) return ["Time", "Program", "Duration", "Location"];
  if(t.includes("museum")) return ["Time", "Program", "Location", "Duration"];
  if(t.includes("airport shuttle")) return ["Departure", "Terminal", "Seats"];
  if(t.includes("employee shuttle")) return ["Departure", "Route", "Arrival"];
  if(t.includes("training day")) return ["Time", "Program", "Location", "Speaker"];
  if(t.includes("development day")) return ["Time", "Program", "Location"];
  if(t.includes("networking")) return ["Time", "Program", "Location"];
  if(t.includes("language program")) return ["Time", "Class", "Room", "Instructor"];
  if(t.includes("film festival")) return ["Time", "Program", "Location", "Duration"];
  if(t.includes("train schedule")) return ["Departure", "Service", "Arrival", "Fare"];
  if(t.includes("farm")) return ["Time", "Activity", "Location"];
  if(t.includes("conference packages")) return ["Package", "Time", "Includes", "Price"];
  if(t.includes("lecture series")) return ["Date / Time", "Lecture", "Speaker", "Location"];
  if(t.includes("orientation schedule")) return ["Time", "Role", "Location", "Duration"];
  if(t.includes("arts weekend")) return ["Time", "Program", "Location"];
  return ["Time / Item", "Details"];
}

function normalizeInfoCells(title:string,label:string,value:string){
  const headers=infoTableSpec(title);
  const parts=splitInfoValue(value);
  if(headers[0]==="Room") {
    const availability=parts[0]?.replace(/^Available\s+/i,"") ?? "";
    const capacity=(parts[1]??"").replace(/^Capacity\s+/i,"");
    return [label, availability, capacity, parts[2]??""];
  }
  if(title.toLowerCase().includes("employee shuttle")){
    return [label, parts[0]??value, (parts[1]??"").replace(/^arrives\s+/i,"")];
  }
  const cells=[label,...parts];
  while(cells.length<headers.length) cells.push("");
  if(cells.length>headers.length){
    const keep=cells.slice(0,headers.length-1);
    keep.push(cells.slice(headers.length-1).join(" — "));
    return keep;
  }
  return cells;
}

function InfoSheetView({info}:{info:NonNullable<Question["information"]>}){
  const headers=infoTableSpec(info.title);
  const subtitleParts=(info.subtitle??"").split("·").map(x=>x.trim()).filter(Boolean);
  return <div className="exam-handout-wrap">
    <div className="exam-handout">
      <h2>{info.title}</h2>
      {subtitleParts.length>0 && <div className="handout-meta">{subtitleParts.map((x,i)=><div key={i}><b>{i===0?"Date":i===1?"Location":"Information"}:</b><span>{x}</span></div>)}</div>}
      <div className="handout-table-scroll">
        <table className="handout-table">
          <thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead>
          <tbody>{info.rows.map((r,i)=>{const cells=normalizeInfoCells(info.title,r.label,r.value);return <tr key={i}>{cells.map((c,j)=><td key={j} className={j===0?"primary-cell":""}>{c}</td>)}</tr>})}</tbody>
        </table>
      </div>
      {info.notes && info.notes.length>0 && <div className="handout-notes">{info.notes.map((n,i)=>{const label=/fee|ticket|rate|cost|admission/i.test(n)?"Fee":i===0?"Note":"";return <div key={i}><b>{label}</b><span>{n}</span></div>})}</div>}
    </div>
  </div>;
}

export default function TestRunner({mode="mock", setNumber=1, questions, guides}:{mode?:RunnerMode; setNumber?:number; questions:Question[]; guides?:Record<string,PracticeHelp>}){
  const isPractice=mode==="practice";
  const [index,setIndex]=useState(0);
  const [phase,setPhase]=useState<Phase>("prep");
  const [remaining,setRemaining]=useState(0);
  const [micReady,setMicReady]=useState(false);
  const [practiceCaptureMode,setPracticeCaptureMode]=useState<PracticeCaptureMode>("record");
  const [started,setStarted]=useState(false);
  const [attempts,setAttempts]=useState<RecordedAttempt[]>([]);
  const [saveStatus,setSaveStatus]=useState("");
  const [signedIn,setSignedIn]=useState(false);
  const recorderRef=useRef<MediaRecorder|null>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const chunksRef=useRef<Blob[]>([]);
  const startRef=useRef(0);
  const runRef=useRef(0);
  const discardStopRef=useRef(false);
  const [audioUrls,setAudioUrls]=useState<Record<string,string>>({});
  const current=questions[index];

  async function prepareMic(){
    try { streamRef.current = await navigator.mediaDevices.getUserMedia({audio:true}); setMicReady(true); }
    catch { setMicReady(false); alert("마이크 권한이 필요합니다."); }
  }

  function speak(text:string, repeat=1){
    return new Promise<void>((resolve)=>{
      if (!("speechSynthesis" in window)){ resolve(); return; }
      window.speechSynthesis.cancel(); let count=0;
      const run=()=>{ const u=new SpeechSynthesisUtterance(text); u.rate=.95; u.lang="en-US"; u.onend=()=>{count++; if(count<repeat) setTimeout(run,350); else resolve();}; u.onerror=()=>resolve(); window.speechSynthesis.speak(u); };
      run();
    });
  }

  function beep(){
    try { const ctx=new AudioContext(); const osc=ctx.createOscillator(); const gain=ctx.createGain(); osc.frequency.value=880; gain.gain.value=.08; osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime+.14); osc.onended=()=>ctx.close(); } catch {}
  }

  function narrationText(q:Question){
    const intro = (q.number===5 || q.number===8) && q.context ? `${q.context} ` : "";
    return `${intro}${q.prompt}`;
  }

  async function narrateThenPrep(q:Question){
    const runId=++runRef.current;
    setPhase("narrating");
    setRemaining(0);
    await speak(narrationText(q), q.repeatPrompt ?? 1);
    if(runId!==runRef.current) return;
    setPhase("prep");
    setRemaining(q.prepSeconds);
  }

  async function beginQuestion(q:Question){
    runRef.current += 1;
    window.speechSynthesis?.cancel();
    if(q.studySeconds){ setPhase("study"); setRemaining(q.studySeconds); return; }
    if(q.taskType==="respond_questions" || q.taskType==="info_response" || q.taskType==="opinion"){
      await narrateThenPrep(q);
      return;
    }
    setPhase("prep");
    setRemaining(q.prepSeconds);
  }

  async function startRecording(){
    if(isPractice && practiceCaptureMode==="no_record"){
      startRef.current=Date.now();
      beep();
      setPhase("recording");
      setRemaining(current.responseSeconds);
      return;
    }
    if(!streamRef.current) return;
    const preferred=["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(t=>MediaRecorder.isTypeSupported?.(t));
    const rec=new MediaRecorder(streamRef.current, preferred?{mimeType:preferred}:undefined);
    recorderRef.current=rec;
    chunksRef.current=[];
    startRef.current=Date.now();
    rec.ondataavailable=(event)=>{ if(event.data.size>0) chunksRef.current.push(event.data); };
    rec.onstop=()=>{
      if(discardStopRef.current){
        discardStopRef.current=false;
        chunksRef.current=[];
        recorderRef.current=null;
        return;
      }
      const duration=Math.max(0,Date.now()-startRef.current);
      const mime=rec.mimeType || preferred || "audio/webm";
      const blob=new Blob(chunksRef.current,{type:mime});
      chunksRef.current=[];
      recorderRef.current=null;
      if(isPractice){
        const url=URL.createObjectURL(blob);
        setAudioUrls(prev=>{ const old=prev[current.id]; if(old) URL.revokeObjectURL(old); return {...prev,[current.id]:url}; });
      }
      const row:RecordedAttempt={questionId:current.id,questionNumber:current.number!,taskType:current.taskType,durationMs:duration,audioBlob:blob,audioMimeType:mime};
      finishResponse(row);
    };
    beep(); rec.start(); setPhase("recording"); setRemaining(current.responseSeconds);
  }
  function stopRecording(){ const rec=recorderRef.current; if(rec && rec.state!=="inactive") rec.stop(); }

  async function finishNoRecordingResponse(){
    const duration=Math.max(0,Date.now()-startRef.current);
    const row:RecordedAttempt={
      questionId:current.id,
      questionNumber:current.number!,
      taskType:current.taskType,
      durationMs:duration,
      featureJson:{practice_without_recording:true}
    };
    await finishResponse(row);
  }

  async function saveAndFinish(rows:RecordedAttempt[]){
    setPhase("done");
    setSaveStatus("");
    const result=await saveMockSession(rows, mode, setNumber);
    setSaveStatus(
      result.mode === "supabase"
        ? "답변이 저장되었습니다. 평가가 완료되면 대시보드에서 결과를 확인할 수 있어요."
        : result.error
          ? "서버에 저장하지 못해 이 기기에만 기록했습니다. 네트워크 상태를 확인해 주세요."
          : "연습 기록을 이 기기에 저장했습니다. 로그인하면 기록과 평가 결과를 이어서 확인할 수 있어요."
    );
  }

  // The completion screen used to link back to the URL the learner was already
  // on, which Next treats as a no-op, so a finished set was a dead end.
  // Reset in place instead; the mic stream stays open for an immediate retry.
  function restartSet(){
    runRef.current += 1;
    window.speechSynthesis?.cancel();
    stopAndDiscardRecording();
    setAudioUrls(prev=>{ Object.values(prev).forEach(URL.revokeObjectURL); return {}; });
    setAttempts([]);
    setSaveStatus("");
    setIndex(0);
    setRemaining(0);
    setPhase("prep");
    setStarted(false);
  }

  async function finishResponse(row:RecordedAttempt){
    const nextAttempts=[...attempts,row];
    setAttempts(nextAttempts);
    if(isPractice){ setPhase("review"); setRemaining(0); return; }
    if(index>=questions.length-1){ await saveAndFinish(nextAttempts); return; }
    setTimeout(()=>setIndex(i=>i+1),450);
  }

  async function nextPracticeQuestion(){
    if(index>=questions.length-1){ await saveAndFinish(attempts); return; }
    setIndex(i=>i+1);
  }

  function clearCurrentPracticeAnswer(){
    setAttempts(prev=>prev.filter((attempt)=>attempt.questionId!==current.id));
    setAudioUrls(prev=>{
      const old=prev[current.id];
      if(old) URL.revokeObjectURL(old);
      const next={...prev};
      delete next[current.id];
      return next;
    });
  }

  function stopAndDiscardRecording(){
    const rec=recorderRef.current;
    if(rec && rec.state!=="inactive"){
      discardStopRef.current=true;
      rec.stop();
    } else {
      chunksRef.current=[];
    }
  }

  async function redoPracticeQuestion(){
    if(!isPractice) return;
    runRef.current += 1;
    window.speechSynthesis?.cancel();
    stopAndDiscardRecording();
    clearCurrentPracticeAnswer();
    setRemaining(0);
    await beginQuestion(current);
  }

  async function skipPracticeQuestion(){
    if(!isPractice || phase==="done") return;
    runRef.current += 1;
    window.speechSynthesis?.cancel();
    stopAndDiscardRecording();
    const cleaned=attempts.filter((attempt)=>attempt.questionId!==current.id);
    setAttempts(cleaned);
    setAudioUrls(prev=>{
      const old=prev[current.id];
      if(old) URL.revokeObjectURL(old);
      const next={...prev};
      delete next[current.id];
      return next;
    });
    if(index>=questions.length-1){
      await saveAndFinish(cleaned);
      return;
    }
    setIndex(i=>i+1);
  }

  useEffect(()=>{ if(started) beginQuestion(current); /* eslint-disable-next-line react-hooks/exhaustive-deps */ },[index,started]);

  // Switching sets only changes a search param, so this client component is
  // re-rendered rather than remounted and would otherwise keep the old run's
  // phase, index and attempts.
  const loadedSetRef=useRef(setNumber);
  useEffect(()=>{
    if(loadedSetRef.current===setNumber) return;
    loadedSetRef.current=setNumber;
    restartSet();
  /* eslint-disable-next-line react-hooks/exhaustive-deps */ },[setNumber]);

  // Saving happens only after the last question, so surface the sign-in state
  // up front rather than letting a full set finish before the fallback message.
  useEffect(()=>{
    const sb=getSupabase(); if(!sb) return;
    sb.auth.getSession().then(({data})=>setSignedIn(Boolean(data.session)));
    const {data:sub}=sb.auth.onAuthStateChange((_event,session)=>setSignedIn(Boolean(session)));
    return ()=>sub.subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!started || phase==="narrating" || phase==="review" || phase==="done") return;
    if(remaining<=0){
      if(phase==="study"){
        narrateThenPrep(current);
      } else if(phase==="prep") startRecording();
      else if(phase==="recording"){
        if(isPractice && practiceCaptureMode==="no_record") finishNoRecordingResponse();
        else stopRecording();
      }
      return;
    }
    const t=setTimeout(()=>setRemaining(v=>v-1),1000); return()=>clearTimeout(t);
  },[remaining,phase,started,current]);

  if(!started) return <div className="test-shell">
    <header className="exam-header"><b>Speaking Test</b><span>{isPractice?`Practice ${setNumber}`:`Mock ${setNumber}`}</span></header>
    <main className="system-check">
      <div className="check-card compact-check">
        <h1>{isPractice?`연습 세트 ${setNumber}`:"마이크 확인"}</h1>
        {isPractice && <>
          <p className="practice-set-note">11문항을 실제 시험 순서와 동일한 시간으로 연습합니다. 답변 후 해설을 확인하거나 같은 문제를 다시 풀 수 있어요.</p>
          <details className="practice-set-picker">
            <summary>다른 연습 세트 선택</summary>
            <div className="practice-set-grid">
              {Array.from({length:15},(_,i)=>i+1).map((n)=><Link key={n} className={n===setNumber?"current":""} href={`/practice?set=${n}`}>{String(n).padStart(2,"0")}</Link>)}
            </div>
          </details>
        </>}
        {isPractice && <div className="capture-choice" role="group" aria-label="연습 녹음 방식">
          <button type="button" className={`capture-option ${practiceCaptureMode==="record"?"selected":""}`} onClick={()=>setPracticeCaptureMode("record")}><Mic size={20}/><span><b>녹음하면서 연습</b><small>답변을 저장하고 다시 들을 수 있습니다.</small></span></button>
          <button type="button" className={`capture-option ${practiceCaptureMode==="no_record"?"selected":""}`} onClick={()=>setPracticeCaptureMode("no_record")}><Volume2 size={20}/><span><b>녹음 없이 연습</b><small>타이머에 맞춰 말한 뒤 바로 해설을 확인합니다.</small></span></button>
        </div>}
        {(!isPractice || practiceCaptureMode==="record") && <div className="check-line"><Mic/><div><b>마이크</b><span>{micReady?"준비 완료":"사용 권한이 필요합니다"}</span></div><button className="button secondary" onClick={prepareMic}>{micReady?"완료":"마이크 확인"}</button></div>}
        {(!isPractice || practiceCaptureMode==="record") && hasSupabase() && !signedIn && <div className="notice"><span>로그인하지 않으면 녹음이 이 기기에만 남고 평가를 받을 수 없어요. <Link href="/" className="text-button">홈에서 로그인하기</Link></span></div>}
        <button disabled={(!isPractice || practiceCaptureMode==="record")&&!micReady} className="button primary large full" onClick={()=>setStarted(true)}>{isPractice?`세트 ${setNumber} 연습 시작`:"시험 시작"}</button>
        <Link href="/" className="text-button center">돌아가기</Link>
      </div>
    </main>
  </div>;

  if(phase==="done") return <div className="test-shell">
    <header className="exam-header"><b>{isPractice?`Practice ${setNumber}`:"Speaking Test"}</b><span>Saved</span></header>
    <main className="complete-screen">
      <CheckCircle2 size={54}/>
      <h1>{isPractice?"연습 저장 완료":"답변 저장 완료"}</h1>
      <p>{saveStatus || "저장 중…"}</p>
      <div className="complete-actions">
        {/* restartSet returns to this runner's setup screen, which is where the
            practice set picker lives, so it covers "redo" and "pick another". */}
        <button className="button primary" onClick={restartSet}>{isPractice?`세트 ${setNumber} 다시 연습`:`세트 ${setNumber} 다시 응시`}</button>
        <Link className="button secondary" href="/dashboard">{isPractice?"내 기록 보기":"대시보드 보기"}</Link>
        <Link className="text-button center" href="/">홈으로</Link>
      </div>
    </main>
  </div>;

  const phaseText=phase==="study"?"Read the information":phase==="prep"?"Preparation time":phase==="recording"?"Response time":phase==="review"?"Review":"Listen to the question";
  return <div className="test-shell">
    <header className="exam-header"><div><b>Speaking Test</b><span>Question {current.number} of 11 {isPractice?`· 연습 세트 ${setNumber}`:""}</span></div><div className="progress"><i style={{width:`${(current.number!/11)*100}%`}}/></div></header>
    <main className={`exam-layout ${isPractice?"practice-layout":""}`}>
      <aside className="exam-sidebar"><div className="question-badge">Question <strong>{current.number}</strong></div><div className={`timer-card ${phase==="recording"?"live":""} ${phase==="review"?"review":""}`}><span>{phaseText}</span><strong>{phase==="narrating"?"LISTEN":phase==="review"?"DONE":formatTime(remaining)}</strong>{phase==="recording"&&<small><i/> {isPractice&&practiceCaptureMode==="no_record"?"Speaking":"Recording"}</small>}</div><div className="task-name">{taskLabel(current)}</div></aside>
      <section className="exam-content">
        <div className="directions">{current.taskType==="read_aloud"&&"Read the text aloud."}{current.taskType==="describe_picture"&&"Describe the picture in as much detail as you can."}{current.taskType==="respond_questions"&&"Answer the question."}{current.taskType==="info_response"&&"Answer using the information provided."}{current.taskType==="opinion"&&"Express your opinion and support it with reasons or examples."}</div>
        {current.context && current.taskType!=="info_response" && <p className="context-line">{current.context}</p>}
        {current.passage && <div className="passage-box">{current.passage}</div>}
        {current.imageUrl && <div className="photo-frame"><img src={current.imageUrl} alt={current.imageAlt ?? "Practice scene"}/></div>}
        {current.information && <InfoSheetView info={current.information}/>}
        {(current.taskType==="respond_questions"||current.taskType==="opinion") && <div className="prompt-box"><span>Question {current.number}</span><p>{current.prompt}</p></div>}
        {current.taskType==="info_response" && isPractice && <details className="info-question-reveal">
          <summary>질문 보기 <small>연습용 · 실제 모의고사에서는 표시되지 않음</small></summary>
          <div className="prompt-box practice-info-prompt"><span>Question {current.number}</span><p>{current.prompt}</p></div>
        </details>}

        {isPractice && phase==="review" && practiceCaptureMode==="record" && audioUrls[current.id] && <div className="answer-playback"><span>내 답변</span><audio controls src={audioUrls[current.id]} preload="metadata"/></div>}
        {isPractice && <PracticeCoach question={current} help={guides?.[current.id]} allowSample={phase==="review"} onListen={(text)=>speak(text,1)}/>}

        {phase==="review" ? <div className="review-actions practice-review-actions"><div><b>답변 완료</b><span>해설을 확인한 뒤 다시 풀거나 다음 문제로 이동하세요.</span></div><div className="review-button-row"><button className="button secondary" onClick={redoPracticeQuestion}><RotateCcw size={17}/> 다시 풀기</button><button className="button primary" onClick={nextPracticeQuestion}>{index>=questions.length-1?"연습 완료":"다음 문제"}<ArrowRight size={17}/></button></div></div> : <div className="status-strip"><span className={`status-dot ${phase}`}/><b>{phaseText}</b>{isPractice && <div className="practice-live-actions"><button type="button" className="practice-restart-button" onClick={redoPracticeQuestion}><RotateCcw size={15}/> 다시 시작</button><button type="button" className="practice-skip-button" onClick={skipPracticeQuestion}><SkipForward size={15}/> 건너뛰기</button></div>}</div>}
      </section>
    </main>
  </div>;
}
