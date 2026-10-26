import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendNewVideoEmail } from "@/lib/email";

// Ejecuta el envío real con el SDK de Resend y solo la red simulada: así se
// comprueba que el email se renderiza (Resend necesita @react-email/render en
// ejecución) y que la petición lleva destinatario, asunto, HTML y logo.
describe("sendNewVideoEmail (humo con Resend real, red simulada)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("RESEND_FROM_EMAIL", "avisos@cvorotava.com");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.com/");
    fetchMock.mockReset();
    fetchMock.mockImplementation(
      async () =>
        new Response(JSON.stringify({ id: "email_1" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renderiza el email y lo envía a cada destinatario sin duplicados", async () => {
    await sendNewVideoEmail({
      to: ["a@club.com", "B@club.com", " a@club.com "],
      video_type: "league_match",
      url: "https://youtu.be/abc123",
      gender: "female",
      season: "2025-2026",
      match: null,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [endpoint, init] = fetchMock.mock.calls[0];
    expect(String(endpoint)).toContain("/emails");
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer re_test_key"
    );

    const body = JSON.parse(init.body);
    expect(body.from).toContain("avisos@cvorotava.com");
    expect(body.to).toBe("a@club.com");
    expect(body.subject).toBeTruthy();
    expect(body.html).toContain("https://youtu.be/abc123");
    expect(body.html).toContain("https://app.example.com/videos");
  });

  it("adjunta el logo para el cid del email", async () => {
    await sendNewVideoEmail({
      to: ["a@club.com"],
      video_type: "training",
      url: "https://youtu.be/xyz",
      gender: "male",
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.attachments).toHaveLength(1);
    expect(body.attachments[0]).toMatchObject({
      filename: "logo.png",
    });
    expect(body.html).toContain("cid:cvorotava-logo");
  });

  it("no envía nada si Resend no está configurado", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await sendNewVideoEmail({
      to: ["a@club.com"],
      video_type: "training",
      url: "https://youtu.be/xyz",
      gender: "male",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("RESEND_API_KEY")
    );
  });

  it("avisa en el log cuando no hay destinatarios", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await sendNewVideoEmail({
      to: [],
      video_type: "training",
      url: "https://youtu.be/xyz",
      gender: "male",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("sin destinatarios")
    );
  });

  it("un error de Resend se registra y no tumba el envío", async () => {
    fetchMock.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({ name: "validation_error", message: "dominio no verificado" }),
          { status: 403, headers: { "content-type": "application/json" } }
        )
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      sendNewVideoEmail({
        to: ["a@club.com"],
        video_type: "training",
        url: "https://youtu.be/xyz",
        gender: "male",
      })
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
  });
});
