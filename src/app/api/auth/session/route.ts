import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySignedPayload } from "@/lib/linkedin-auth";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const sessionCookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!sessionCookie) {
    return NextResponse.json({ authenticated: false });
  }

  const rawValue = sessionCookie.split("=")[1];
  const session = verifySignedPayload(rawValue);

  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      sub: session.sub,
      name: session.name,
      givenName: session.givenName,
      familyName: session.familyName,
      picture: session.picture,
      email: session.email,
      emailVerified: session.emailVerified,
    },
  });
}
