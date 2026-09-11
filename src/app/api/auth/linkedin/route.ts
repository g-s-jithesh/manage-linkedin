import { NextResponse } from "next/server";
import { STATE_COOKIE_NAME, getLinkedInEnv, isProduction, makeStateValue, cookieOptions } from "@/lib/linkedin-auth";

export async function GET() {
  const env = getLinkedInEnv();

  if (!env.ok) {
    return NextResponse.json({ error: env.reason }, { status: 500 });
  }

  const state = makeStateValue();
  const scope = `openid profile email w_member_social`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.clientId,
    redirect_uri: env.redirectUri,
    state,
    scope,
  });

  const authorizationUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(STATE_COOKIE_NAME, state, {
    ...cookieOptions(60 * 5),
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: 60 * 5,
  });

  return response;
}
