import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySignedPayload } from "@/lib/linkedin-auth";
import { MAX_DELAY_MS, cancelScheduled, listScheduled, schedulePost } from "@/lib/scheduler";

const err = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });
const getSession = async () => verifySignedPayload((await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null);

// multipart/form-data: text, files?, at (epoch ms)
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.accessToken) return err("Log in with LinkedIn again to schedule.", 401);

  const form = await req.formData().catch(() => null);
  const text = String(form?.get("text") ?? "");
  const files = (form?.getAll("files") ?? []).filter((f): f is File => f instanceof File && f.size > 0);
  const at = Number(form?.get("at"));

  if (!text.trim() && !files.length) return err("Post is empty.");
  if (!Number.isFinite(at) || at <= Date.now()) return err("Pick a time in the future.");
  if (at - Date.now() > MAX_DELAY_MS) return err("Schedule at most 24 days ahead.");

  const id = schedulePost(session.sub, session.accessToken, text, files, at);
  return NextResponse.json({ success: true, id });
}

export async function GET() {
  const session = await getSession();
  if (!session) return err("Not logged in.", 401);
  return NextResponse.json({ success: true, items: listScheduled(session.sub) });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return err("Not logged in.", 401);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  return cancelScheduled(session.sub, id) ? NextResponse.json({ success: true }) : err("Not found.", 404);
}
