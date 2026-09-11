import crypto from "crypto";

export const SESSION_COOKIE_NAME = "managerapp_session";
export const STATE_COOKIE_NAME = "managerapp_linkedin_state";

export type LinkedInSession = {
  sub: string;
  name: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  email?: string;
  emailVerified?: boolean;
  connectedAt: number;
};

export function getLinkedInEnv() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return {
      ok: false,
      reason: "Missing LinkedIn environment variables.",
      clientId,
      clientSecret,
      redirectUri,
    } as const;
  }

  return {
    ok: true,
    reason: "",
    clientId,
    clientSecret,
    redirectUri,
  } as const;
}

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function makeStateValue() {
  return crypto.randomBytes(32).toString("hex");
}

export function verifyState(value: string | null, expected: string | null) {
  if (!value || !expected) return false;
  if (value.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(value), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function parseCookies(header?: string | null) {
  if (!header) return new Map<string, string>();
  return new Map(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const equalIndex = part.indexOf("=");
        if (equalIndex < 0) return [part, ""];
        const key = part.slice(0, equalIndex);
        const value = decodeURIComponent(part.slice(equalIndex + 1));
        return [key, value];
      })
  );
}

export function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

export function signPayload(payload: LinkedInSession) {
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const secret = process.env.AUTH_COOKIE_SECRET || process.env.LINKEDIN_CLIENT_SECRET || "managerapp-local-dev-signing-secret";
  const signature = crypto
    .createHmac("sha256", secret)
    .update(encoded)
    .digest("hex");

  return `${encoded}.${signature}`;
}

export function verifySignedPayload(value: string | null) {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;

  const [encoded, suppliedSignature] = parts;
  const secret = process.env.AUTH_COOKIE_SECRET || process.env.LINKEDIN_CLIENT_SECRET || "managerapp-local-dev-signing-secret";
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(encoded)
    .digest("hex");

  try {
    if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(suppliedSignature))) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(encoded)) as LinkedInSession;
    if (!parsed.sub || !parsed.name || !parsed.connectedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function cookieOptions(maxAge = 60 * 60 * 24 * 7) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction(),
    path: "/",
    maxAge,
  };
}

export function addSessionCookie(response: { cookies: { set: (name: string, value: string, options: unknown) => void } }, session: LinkedInSession) {
  const value = signPayload(session);
  response.cookies.set(SESSION_COOKIE_NAME, value, cookieOptions(60 * 60 * 24 * 7));
}

export function clearSessionCookie(response: { cookies: { set: (name: string, value: string, options: unknown) => void } }) {
  response.cookies.set(SESSION_COOKIE_NAME, "", { ...cookieOptions(0), maxAge: 0 });
}
