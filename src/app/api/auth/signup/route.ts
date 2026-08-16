import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// The project requires email confirmation, but it sends through Supabase's
// built-in SMTP, which is a testing service: a few messages an hour, delivered
// only to team addresses. Learners signed up, were told to check their mail and
// never received anything. Create the account confirmed from the server instead,
// where the service-role key is safe, and let the browser sign in normally.

function jsonError(code: string, status: number) {
  return NextResponse.json({ error: code }, { status });
}

// Creating accounts is unauthenticated by nature, so throttle per address to
// keep the endpoint from being used to bulk-create users.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return jsonError("not_configured", 503);

  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("bad_request", 400);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError("invalid_email", 400);
  if (password.length < 6) return jsonError("weak_password", 400);
  if (rateLimited(email)) return jsonError("rate_limited", 429);

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    // Supabase reports an existing address as email_exists / "already been registered".
    if (/already|exists/i.test(error.message) || error.status === 422) {
      return jsonError("email_exists", 409);
    }
    return jsonError("signup_failed", 500);
  }

  return NextResponse.json({ ok: true });
}
