export const GATE_COOKIE = "cvorotava_gate";
export const GATE_HEADER = "x-cvorotava-gate";
export const GATE_TTL_SEC = 60;

export type GateGender = "male" | "female" | null;

export type GateClaims = {
  sub: string;
  email: string;
  is_active: boolean;
  isAdmin: boolean;
  role: string | null;
  user_name: string;
  gender: GateGender;
  exp: number;
};

function getSecret(): string | null {
  return (
    process.env.CVOROTAVA_GATE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    null
  );
}

function bytesToB64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64UrlToBytes(token: string): Uint8Array {
  const pad = "=".repeat((4 - (token.length % 4)) % 4);
  const b64 = token.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signGate(claims: GateClaims): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;
  const body = bytesToB64Url(new TextEncoder().encode(JSON.stringify(claims)));
  const key = await hmacKey(secret);
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))
  );
  return `${body}.${bytesToB64Url(sig)}`;
}

export async function verifyGate(
  token: string | null | undefined
): Promise<GateClaims | null> {
  if (!token) return null;
  const secret = getSecret();
  if (!secret) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sigPart = token.slice(dot + 1);
  if (!body || !sigPart) return null;

  try {
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      b64UrlToBytes(sigPart) as BufferSource,
      new TextEncoder().encode(body)
    );
    if (!ok) return null;
    const parsed = JSON.parse(
      new TextDecoder().decode(b64UrlToBytes(body))
    ) as GateClaims;
    if (!parsed?.sub || !parsed?.email || typeof parsed.exp !== "number") {
      return null;
    }
    if (parsed.exp * 1000 <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function gateCookieOptions(maxAge = GATE_TTL_SEC) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function claimsMatchUser(
  claims: GateClaims,
  userId: string,
  email: string
): boolean {
  return claims.sub === userId && claims.email === email;
}

/** RSC / Route Handler: header from middleware, else cookie. */
export async function readGateFromRequest(): Promise<GateClaims | null> {
  try {
    const { cookies, headers } = await import("next/headers");
    const headerStore = await headers();
    const fromHeader = headerStore.get(GATE_HEADER);
    const fromHeaderClaims = await verifyGate(fromHeader);
    if (fromHeaderClaims) return fromHeaderClaims;
    const cookieStore = await cookies();
    return verifyGate(cookieStore.get(GATE_COOKIE)?.value);
  } catch {
    return null;
  }
}
