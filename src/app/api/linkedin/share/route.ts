import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySignedPayload } from "@/lib/linkedin-auth";
import { publishPost } from "@/lib/linkedin-publish";

// Accepts multipart/form-data: `text` + optional `files` (up to 9 images, or 1 video).
export async function POST(req: Request) {
  const session = verifySignedPayload((await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null);
  if (!session?.accessToken) {
    return NextResponse.json({ success: false, error: "Log in with LinkedIn again to post." }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const text = String(form?.get("text") ?? "");
  const files = (form?.getAll("files") ?? []).filter((f): f is File => f instanceof File && f.size > 0);

  const r = await publishPost(session.accessToken, session.sub, text, files);
  if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: r.status });
  return NextResponse.json({ success: true, id: r.id });
}
