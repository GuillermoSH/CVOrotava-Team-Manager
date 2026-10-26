import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServerClient } from "@supabase/ssr";

// Humo del flujo de cookies de sesión con @supabase/ssr real y la red
// simulada: es lo que usan el proxy, el callback de Google y el logout. Si una
// actualización cambia cómo se leen/escriben las cookies, esto falla.
const SUPABASE_URL = "https://abcdefgh.supabase.co";
const COOKIE_BASE = "sb-abcdefgh-auth-token";

type Cookie = { name: string; value: string; options: Record<string, unknown> };

function jwt(payload: Record<string, unknown>) {
  const enc = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${enc({ alg: "HS256", typ: "JWT" })}.${enc(payload)}.firma`;
}

const user = {
  id: "11111111-1111-1111-1111-111111111111",
  aud: "authenticated",
  email: "jugador@club.com",
  app_metadata: {},
  user_metadata: {},
  created_at: "2025-01-01T00:00:00Z",
};

function sessionResponse() {
  return {
    access_token: jwt({
      sub: user.id,
      email: user.email,
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
    refresh_token: "refresh-123",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user,
  };
}

function makeClient(incoming: { name: string; value: string }[]) {
  const written: Cookie[] = [];
  const client = createServerClient(SUPABASE_URL, "anon-key", {
    cookies: {
      getAll: () => incoming,
      setAll: (list) => {
        list.forEach(({ name, value, options }) =>
          written.push({ name, value, options: options ?? {} })
        );
      },
    },
  });
  return { client, written };
}

/** Inicia el login con Google como lo haría el navegador y devuelve la cookie del verificador PKCE que escribe la librería. */
async function startLogin() {
  const { client, written } = makeClient([]);
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://app.example.com/api/auth/callback",
      skipBrowserRedirect: true,
    },
  });
  expect(error).toBeNull();
  const verifier = written.find((c) => c.name === `${COOKIE_BASE}-code-verifier`);
  expect(verifier).toBeDefined();
  return [{ name: verifier!.name, value: verifier!.value }];
}

describe("@supabase/ssr: cookies de sesión (red simulada)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("el callback canjea el código y escribe las cookies de sesión", async () => {
    fetchMock.mockImplementation(
      async () =>
        new Response(JSON.stringify(sessionResponse()), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
    );

    const { client, written } = makeClient(await startLogin());

    const { data, error } = await client.auth.exchangeCodeForSession("code-1");

    expect(error).toBeNull();
    expect(data.session?.user.email).toBe("jugador@club.com");

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/auth/v1/token?grant_type=pkce");

    const sessionCookies = written.filter(
      (c) => c.name.startsWith(COOKIE_BASE) && c.value !== ""
    );
    expect(sessionCookies.length).toBeGreaterThan(0);
    expect(sessionCookies.every((c) => c.options.path === "/")).toBe(true);
  });

  it("con cookie de sesión válida, getUser devuelve al usuario", async () => {
    // Primero obtenemos las cookies reales que escribe la librería…
    fetchMock.mockImplementation(
      async () =>
        new Response(JSON.stringify(sessionResponse()), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
    );
    const first = makeClient(await startLogin());
    await first.client.auth.exchangeCodeForSession("code-1");
    const session = first.written.filter(
      (c) => c.name.startsWith(COOKIE_BASE) && c.value !== ""
    );

    // …y las usamos como cookies entrantes de la siguiente petición (proxy).
    fetchMock.mockReset();
    fetchMock.mockImplementation(
      async () =>
        new Response(JSON.stringify(user), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
    );
    const second = makeClient(
      session.map(({ name, value }) => ({ name, value }))
    );
    const {
      data: { user: found },
    } = await second.client.auth.getUser();

    expect(found?.email).toBe("jugador@club.com");
    expect(String(fetchMock.mock.calls[0][0])).toContain("/auth/v1/user");
  });

  it("el logout limpia las cookies de sesión", async () => {
    fetchMock.mockImplementation(
      async () =>
        new Response(JSON.stringify(sessionResponse()), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
    );
    const first = makeClient(await startLogin());
    await first.client.auth.exchangeCodeForSession("code-1");
    const session = first.written.filter(
      (c) => c.name.startsWith(COOKIE_BASE) && c.value !== ""
    );

    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => new Response(null, { status: 204 }));
    const out = makeClient(session.map(({ name, value }) => ({ name, value })));
    await out.client.auth.signOut();

    const cleared = out.written.filter((c) => c.name.startsWith(COOKIE_BASE));
    expect(cleared.length).toBeGreaterThan(0);
    expect(cleared.every((c) => c.value === "" || c.options.maxAge === 0)).toBe(
      true
    );
  });
});
