import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySignedPayload } from "@/lib/linkedin-auth";

const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

// Accepts multipart/form-data: `text` + optional `files` (up to 9 images, or 1 video).
export async function POST(req: Request) {
  const session = verifySignedPayload((await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null);
  if (!session?.accessToken) return fail("Log in with LinkedIn again to post.", 401);

  const form = await req.formData().catch(() => null);
  const text = String(form?.get("text") ?? "");
  const files = (form?.getAll("files") ?? []).filter((f): f is File => f instanceof File && f.size > 0);
  if (!text.trim() && !files.length) return fail("Post is empty.");

  const isVideo = files[0]?.type.startsWith("video/");
  if (files.some((f) => f.type.startsWith("video/") !== !!isVideo || !/^(image|video)\//.test(f.type))) {
    return fail("Attach either images or a single video.");
  }
  if (isVideo && files.length > 1) return fail("Only one video per post.");
  if (files.length > 9) return fail("Maximum 9 images per post.");

  const auth = { Authorization: `Bearer ${session.accessToken}`, "X-Restli-Protocol-Version": "2.0.0" };
  const owner = `urn:li:person:${session.sub}`;

  const media = [];
  for (const file of files) {
    const reg = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: [`urn:li:digitalmediaRecipe:feedshare-${isVideo ? "video" : "image"}`],
          owner,
          serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
        },
      }),
    });
    if (!reg.ok) return fail(`LinkedIn upload registration failed: ${await reg.text()}`, reg.status);
    const { value } = await reg.json();
    const uploadUrl = value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;

    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: { Authorization: auth.Authorization, "Content-Type": "application/octet-stream" },
      body: Buffer.from(await file.arrayBuffer()),
    });
    if (!put.ok) return fail(`Uploading ${file.name} failed (${put.status}).`, 502);
    media.push({ status: "READY", media: value.asset });
  }

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      author: owner,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: media.length ? (isVideo ? "VIDEO" : "IMAGE") : "NONE",
          ...(media.length && { media }),
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  if (!res.ok) return fail(`LinkedIn error: ${await res.text()}`, res.status);
  return NextResponse.json({ success: true, id: res.headers.get("x-restli-id") });
}
