import { NextResponse, type NextRequest } from "next/server";

/**
 * Legacy path: bounce OAuth codes to the server callback so allowlist deny
 * can clear cookies on the redirect response.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  url.pathname = "/api/auth/callback";
  return NextResponse.redirect(url);
}
