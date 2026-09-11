import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STATE_COOKIE_NAME, SESSION_COOKIE_NAME, getLinkedInEnv, verifyState, signPayload, cookieOptions } from "@/lib/linkedin-auth";

export async function GET(request: Request) {
  const env = getLinkedInEnv();

  if (!env.ok) {
    return NextResponse.redirect(new URL("/?error=linkedin_env_missing", request.url));
  }

  const url = new URL(request.url);
  const params = url.searchParams;
  const code = params.get("code");
  const incomingState = params.get("state");
  const error = params.get("error");
  const errorDescription = params.get("error_description");

  if (error) {
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(errorDescription || error)}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?error=missing_authorization_code", request.url));
  }

  const stateValue = (await cookies()).get(STATE_COOKIE_NAME)?.value || null;
  const stateIsValid = verifyState(incomingState || "", stateValue || "");

  if (!stateIsValid || !incomingState) {
    return NextResponse.redirect(new URL("/?error=invalid_oauth_state", request.url));
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: env.redirectUri,
    client_id: env.clientId,
    client_secret: env.clientSecret,
  });

  const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL("/?error=token_exchange_failed", request.url));
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };

  if (!tokenData.access_token) {
    return NextResponse.redirect(new URL("/?error=missing_access_token", request.url));
  }

  const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/json",
    },
  });

  if (!profileResponse.ok) {
    return NextResponse.redirect(new URL("/?error=profile_fetch_failed", request.url));
  }

  const profile = (await profileResponse.json()) as {
    sub?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
    email?: string;
    email_verified?: boolean;
  };

  if (!profile.sub || !profile.name) {
    return NextResponse.redirect(new URL("/?error=profile_missing_required_fields", request.url));
  }

  const session = {
    sub: profile.sub,
    name: profile.name,
    givenName: profile.given_name,
    familyName: profile.family_name,
    picture: profile.picture,
    email: profile.email,
    emailVerified: profile.email_verified,
    connectedAt: Date.now(),
  };

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(SESSION_COOKIE_NAME, signPayload(session), {
    ...cookieOptions(60 * 60 * 24 * 7),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  response.cookies.set(STATE_COOKIE_NAME, "", {
    ...cookieOptions(0),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
