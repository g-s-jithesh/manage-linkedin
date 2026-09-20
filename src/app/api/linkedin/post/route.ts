import { NextResponse } from "next/server";
import { grabLinkedInPost, parseLinkedInPostInput } from "@/lib/linkedin-post-grabber";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const input = body?.input?.trim();

    if (!input) {
      return NextResponse.json(
        { success: false, error: "Please provide a LinkedIn post URL or Post ID." },
        { status: 400 }
      );
    }

    const parsed = parseLinkedInPostInput(input);
    if (!parsed.isValid) {
      return NextResponse.json(
        { success: false, error: parsed.error || "Invalid LinkedIn post URL or ID." },
        { status: 400 }
      );
    }

    const post = await grabLinkedInPost(input);

    return NextResponse.json({
      success: true,
      post,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to grab post";
    console.error("Grab post error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const input = searchParams.get("url") || searchParams.get("id") || searchParams.get("input");

    if (!input) {
      return NextResponse.json(
        { success: false, error: "Missing query parameter. Provide ?url= or ?id=" },
        { status: 400 }
      );
    }

    const parsed = parseLinkedInPostInput(input);
    if (!parsed.isValid) {
      return NextResponse.json(
        { success: false, error: parsed.error || "Invalid LinkedIn post URL or ID." },
        { status: 400 }
      );
    }

    const post = await grabLinkedInPost(input);

    return NextResponse.json({
      success: true,
      post,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to grab post";
    console.error("Grab post error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
