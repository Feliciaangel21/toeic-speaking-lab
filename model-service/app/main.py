from __future__ import annotations

import json
import tempfile
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import BackgroundTasks, FastAPI, File, Form, Header, HTTPException
from fastapi.responses import HTMLResponse
from fastapi import UploadFile

from app.audio import convert_to_wav
from app.config import settings
from app.jobs import SupabaseEvaluationQueue
from app.pipeline import EvaluationPipeline
from app.schemas import QuestionPayload

app = FastAPI(title="Speaking Lab Evaluation Service", version="0.3.0")
pipeline = EvaluationPipeline()
queue = SupabaseEvaluationQueue(pipeline)
_runner_lock = threading.Lock()
_runner_state: dict[str, Any] = {
    "running": False,
    "startedAt": None,
    "finishedAt": None,
    "total": 0,
    "processed": 0,
    "succeeded": 0,
    "failed": 0,
    "current": None,
    "selectedSessionId": None,
    "lastError": None,
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def authorize(token: str | None) -> None:
    if settings.service_token and token != settings.service_token:
        raise HTTPException(status_code=401, detail="Invalid model-service token")


def ensure_runner_enabled() -> None:
    if not settings.enable_local_runner:
        raise HTTPException(status_code=404, detail="Local runner is disabled")
    if not queue.configured:
        raise HTTPException(status_code=503, detail="Supabase queue is not configured in model-service/.env")


def run_pending_job(limit: int, session_id: str) -> None:
    try:
        queue.reconcile_incomplete_sessions()
        attempts = queue.pending_attempts(limit, session_id=session_id)
        with _runner_lock:
            _runner_state.update({"total": len(attempts), "processed": 0, "succeeded": 0, "failed": 0, "current": None, "selectedSessionId": session_id})
        for attempt in attempts:
            with _runner_lock:
                _runner_state["current"] = {
                    "attemptId": attempt.get("id"),
                    "sessionId": attempt.get("session_id"),
                    "questionNumber": attempt.get("question_number"),
                }
            result = queue.process_attempt(attempt)
            with _runner_lock:
                _runner_state["processed"] += 1
                if result.get("ok"):
                    _runner_state["succeeded"] += 1
                else:
                    _runner_state["failed"] += 1
                    _runner_state["lastError"] = result.get("error")
    except Exception as exc:
        with _runner_lock:
            _runner_state["lastError"] = str(exc)[:1000]
    finally:
        with _runner_lock:
            _runner_state["running"] = False
            _runner_state["finishedAt"] = now_iso()
            _runner_state["current"] = None


@app.get("/health")
def health() -> dict:
    providers = pipeline.provider_status()
    return {
        "ok": True,
        "pipeline": pipeline.pipeline_version,
        "providers": providers,
        "readyForEvaluation": pipeline.whisper.ready,
        "queueConfigured": queue.configured,
        "localRunnerEnabled": settings.enable_local_runner,
    }


@app.get("/runner", response_class=HTMLResponse)
def runner_page() -> str:
    ensure_runner_enabled()
    return """<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Speaking Lab · Local Evaluator</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f6f4ee;color:#19231f;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Noto Sans KR",sans-serif}.wrap{max-width:820px;margin:0 auto;padding:64px 24px}.eyebrow{font-size:11px;font-weight:800;letter-spacing:.14em;color:#6e7d75}.card{margin-top:24px;background:#fffdf8;border:1px solid #dedfd8;border-radius:22px;padding:30px;box-shadow:0 12px 36px rgba(30,42,36,.05)}h1{font-size:34px;letter-spacing:-.04em;margin:8px 0 10px}p{color:#69746e;line-height:1.65}.counts{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:28px 0}.count{background:#f2f2ec;border-radius:14px;padding:14px}.count span{display:block;font-size:11px;color:#7c8781}.count strong{display:block;font-size:24px;margin-top:4px}.session-picker{margin:20px 0}.session-picker label{display:block;font-size:12px;font-weight:800;margin-bottom:8px;color:#58655f}.session-picker select{width:100%;border:1px solid #dfe1da;border-radius:13px;background:#fff;padding:14px 15px;font:inherit;color:#24332c}.status{min-height:74px;padding:16px;border:1px solid #e3e4de;border-radius:14px;background:#faf9f5;font-size:13px;line-height:1.6}.actions{display:flex;gap:10px;margin-top:16px}button{border:0;border-radius:12px;padding:14px 18px;font-weight:800;cursor:pointer;background:#183d2c;color:white}button.secondary{background:#e9ece7;color:#304239}button:disabled{opacity:.45;cursor:not-allowed}.note{font-size:12px;margin-top:18px;color:#89918d}@media(max-width:600px){.counts{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body><main class="wrap"><div class="eyebrow">LOCAL EVALUATOR</div><h1>세션별 말하기 평가</h1><p>평가할 모의고사 세션을 하나 선택하세요. 선택한 세션의 녹음만 이 컴퓨터로 가져와 평가하고 결과를 다시 저장합니다.</p><section class="card"><div class="counts"><div class="count"><span>대기</span><strong id="pending">–</strong></div><div class="count"><span>평가 중</span><strong id="processing">–</strong></div><div class="count"><span>완료</span><strong id="completed">–</strong></div><div class="count"><span>실패</span><strong id="failed">–</strong></div></div><div class="session-picker"><label for="session">평가할 세션</label><select id="session"><option value="">불러오는 중…</option></select></div><div class="status" id="status">상태를 확인하는 중…</div><div class="actions"><button id="run">이 세션 평가 실행</button><button class="secondary" id="refresh">새로고침</button></div><div class="note">이 페이지는 로컬 전용입니다. Docker 포트는 127.0.0.1:8100으로만 열어 두세요.</div></section></main>
<script>
const $=id=>document.getElementById(id);let timer;let lastSession='';
function fmtDate(v){if(!v)return '';try{return new Intl.DateTimeFormat('ko-KR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return ''}}
async function refresh(){
  const r=await fetch('/v1/jobs/status',{cache:'no-store'});const j=await r.json();
  const c=j.counts||{};['pending','processing','completed','failed'].forEach(k=>$(k).textContent=c[k]??0);
  const sessions=j.sessions||[]; const sel=$('session'); const current=sel.value||lastSession;
  sel.innerHTML=sessions.length?sessions.map(s=>{const label=s.mode==='mock'?`모의고사 ${s.mock_set_number||''}`:'연습 세션';return `<option value="${s.id}">${label} · ${s.pending_count}문항 · ${fmtDate(s.created_at)}</option>`}).join(''):'<option value="">평가 대기 중인 세션 없음</option>';
  if(current && sessions.some(s=>s.id===current))sel.value=current; lastSession=sel.value;
  $('run').disabled=Boolean(j.running)||!sel.value; sel.disabled=Boolean(j.running);
  if(j.running){const cur=j.current; $('status').textContent=`평가 중 · ${j.processed}/${j.total}${cur?.questionNumber?` · Q${cur.questionNumber}`:''}`;}
  else if(j.finishedAt){$('status').textContent=`완료 · 성공 ${j.succeeded} · 실패 ${j.failed}${j.lastError?` · 마지막 오류: ${j.lastError}`:''}`;}
  else $('status').textContent=sessions.length?'세션을 선택한 뒤 평가를 실행하세요.':'현재 평가 대기 중인 세션이 없습니다.';
  if(j.running){clearTimeout(timer);timer=setTimeout(refresh,1500)}
}
$('session').onchange=e=>{lastSession=e.target.value};
$('run').onclick=async()=>{const id=$('session').value;if(!id)return;$('run').disabled=true;$('status').textContent='선택한 세션 평가를 시작하는 중…';const r=await fetch(`/v1/jobs/start?sessionId=${encodeURIComponent(id)}&limit=50`,{method:'POST'});if(!r.ok){$('status').textContent=`시작 실패: ${await r.text()}`;return;}refresh();};
$('refresh').onclick=refresh;refresh();
</script></body></html>"""


@app.get("/v1/jobs/status")
def runner_status() -> dict:
    ensure_runner_enabled()
    with _runner_lock:
        state = dict(_runner_state)
    try:
        state["counts"] = queue.counts()
        state["sessions"] = queue.pending_sessions()
    except Exception as exc:
        state["counts"] = {"pending": 0, "processing": 0, "completed": 0, "failed": 0}
        state["sessions"] = []
        state["lastError"] = str(exc)[:1000]
    return state


@app.post("/v1/jobs/start")
def runner_start(background_tasks: BackgroundTasks, sessionId: str, limit: int = 50) -> dict:
    ensure_runner_enabled()
    if not pipeline.whisper.ready:
        raise HTTPException(status_code=503, detail="Whisper is not ready. Run scripts/bootstrap_models.sh first.")
    pending = queue.pending_attempts(1, session_id=sessionId)
    if not pending:
        raise HTTPException(status_code=404, detail="No pending uploaded recordings for this session")
    with _runner_lock:
        if _runner_state["running"]:
            return {"started": False, "reason": "already_running"}
        _runner_state.update({
            "running": True,
            "startedAt": now_iso(),
            "finishedAt": None,
            "total": 0,
            "processed": 0,
            "succeeded": 0,
            "failed": 0,
            "current": None,
            "selectedSessionId": sessionId,
            "lastError": None,
        })
    background_tasks.add_task(run_pending_job, max(1, min(limit, 50)), sessionId)
    return {"started": True}


@app.post("/v1/evaluate")
async def evaluate(
    audio: UploadFile = File(...),
    durationMs: int = Form(...),
    question: str = Form(...),
    x_model_service_token: str | None = Header(default=None),
) -> dict:
    authorize(x_model_service_token)
    if not pipeline.whisper.ready:
        raise HTTPException(status_code=503, detail="Whisper provider is not ready. Run model-service/scripts/bootstrap_models.sh first.")
    try:
        question_payload = QuestionPayload.model_validate(json.loads(question))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid question payload: {exc}") from exc

    suffix = Path(audio.filename or "answer.webm").suffix or ".webm"
    with tempfile.TemporaryDirectory(prefix="speaking-eval-") as tmp:
        source = Path(tmp) / f"input{suffix}"
        wav = Path(tmp) / "input.wav"
        source.write_bytes(await audio.read())
        try:
            convert_to_wav(source, wav)
            return pipeline.evaluate(question_payload, wav, max(1, durationMs))
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)[:1200]) from exc
