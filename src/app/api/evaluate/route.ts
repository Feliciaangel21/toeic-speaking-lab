import { NextResponse } from "next/server";
import { findMockQuestionById } from "@/lib/build-test";
import { findPracticeQuestionById } from "@/lib/build-practice";

export const runtime = "nodejs";
export const maxDuration = 120;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const serviceUrl = process.env.MODEL_SERVICE_URL?.replace(/\/$/, "");
  if (!serviceUrl) return jsonError("MODEL_SERVICE_URL is not configured.", 503);

  const form = await request.formData();
  const questionId = String(form.get("questionId") ?? "");
  const durationMs = Number(form.get("durationMs") ?? 0);
  const audio = form.get("audio");

  if (!questionId) return jsonError("questionId is required.", 400);
  if (!(audio instanceof File) || audio.size === 0) return jsonError("audio is required.", 400);

  const question = findMockQuestionById(questionId) ?? findPracticeQuestionById(questionId);
  if (!question) return jsonError("Unknown questionId.", 404);

  const upstream = new FormData();
  upstream.set("audio", audio, audio.name || `answer-${questionId}.webm`);
  upstream.set("durationMs", String(Number.isFinite(durationMs) && durationMs > 0 ? durationMs : question.responseSeconds * 1000));
  upstream.set("question", JSON.stringify({
    id: question.id,
    number: question.number,
    taskType: question.taskType,
    prompt: question.prompt,
    passage: question.passage,
    imageAlt: question.imageAlt,
    information: question.information,
    metadata: question.metadata,
  }));

  const headers: HeadersInit = {};
  if (process.env.MODEL_SERVICE_TOKEN) headers["x-model-service-token"] = process.env.MODEL_SERVICE_TOKEN;

  try {
    const response = await fetch(`${serviceUrl}/v1/evaluate`, {
      method: "POST",
      headers,
      body: upstream,
      cache: "no-store",
    });

    const text = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        { error: "Model service evaluation failed.", upstreamStatus: response.status, detail: text.slice(0, 1200) },
        { status: 502 },
      );
    }

    return new NextResponse(text, {
      status: 200,
      headers: { "content-type": response.headers.get("content-type") || "application/json" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Model service is unavailable.", detail: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}
