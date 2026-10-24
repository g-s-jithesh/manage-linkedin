import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySignedPayload } from "@/lib/linkedin-auth";

// Best-effort: GET /api/linkedin/stats?id=<post urn> -> { likes, comments } or { error }.
export async function GET(req: Request) {
  const session = verifySignedPayload((await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null);
  if (!session?.accessToken) return NextResponse.json({ error: "Log in with LinkedIn again." }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^urn:li:[A-Za-z]+:[\w-]+$/.test(id)) return NextResponse.json({ error: "Invalid post id." }, { status: 400 });

  const res = await fetch(`https://api.linkedin.com/v2/socialActions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${session.accessToken}`, "X-Restli-Protocol-Version": "2.0.0" },
  });
  if (res.status === 403) return NextResponse.json({ error: "Analytics not permitted for this app." }, { status: 403 });
  if (!res.ok) return NextResponse.json({ error: `LinkedIn error ${res.status}` }, { status: res.status });

  const d = await res.json();
  return NextResponse.json({
    likes: d.likesSummary?.totalLikes ?? 0,
    comments: d.commentsSummary?.aggregatedTotalComments ?? d.commentsSummary?.totalFirstLevelComments ?? 0,
  });
}
