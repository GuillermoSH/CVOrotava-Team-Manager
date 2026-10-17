import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signGate, verifyGate, type GateClaims } from "@/lib/auth/gate";

const sample = (): GateClaims => ({
  sub: "11111111-1111-1111-1111-111111111111",
  email: "jugador@cvorotava.test",
  is_active: true,
  isAdmin: false,
  role: "player",
  user_name: "Jugador",
  gender: "male",
  exp: Math.floor(Date.now() / 1000) + 60,
});

describe("gate cookie HMAC", () => {
  const original = {
    gate: process.env.CVOROTAVA_GATE_SECRET,
    service: process.env.SUPABASE_SERVICE_ROLE_KEY,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  };

  beforeEach(() => {
    process.env.CVOROTAVA_GATE_SECRET = "test-gate-secret-not-for-prod";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NODE_ENV = "test";
    delete process.env.VERCEL_ENV;
  });

  afterEach(() => {
    if (original.gate === undefined) delete process.env.CVOROTAVA_GATE_SECRET;
    else process.env.CVOROTAVA_GATE_SECRET = original.gate;
    if (original.service === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = original.service;
    process.env.NODE_ENV = original.nodeEnv;
    if (original.vercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = original.vercelEnv;
    vi.restoreAllMocks();
  });

  it("round-trips a valid payload", async () => {
    const claims = sample();
    const token = await signGate(claims);
    expect(token).toBeTruthy();
    const back = await verifyGate(token);
    expect(back?.sub).toBe(claims.sub);
    expect(back?.email).toBe(claims.email);
    expect(back?.isAdmin).toBe(false);
  });

  it("rejects a tampered body", async () => {
    const token = await signGate(sample());
    expect(token).toBeTruthy();
    const [body, sig] = token!.split(".");
    const tampered = `A${body.slice(1)}.${sig}`;
    expect(await verifyGate(tampered)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await signGate({ ...sample(), exp: 1 });
    expect(await verifyGate(token)).toBeNull();
  });

  it("rejects garbage", async () => {
    expect(await verifyGate("not-a-token")).toBeNull();
    expect(await verifyGate("")).toBeNull();
    expect(await verifyGate(null)).toBeNull();
  });

  it("prefers CVOROTAVA_GATE_SECRET over the service role key", async () => {
    process.env.CVOROTAVA_GATE_SECRET = "dedicated-secret";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    const token = await signGate(sample());
    expect(token).toBeTruthy();

    process.env.CVOROTAVA_GATE_SECRET = "other-dedicated";
    expect(await verifyGate(token)).toBeNull();

    process.env.CVOROTAVA_GATE_SECRET = "dedicated-secret";
    expect(await verifyGate(token)).not.toBeNull();
  });

  it("fails closed in production when CVOROTAVA_GATE_SECRET is missing", async () => {
    delete process.env.CVOROTAVA_GATE_SECRET;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.NODE_ENV = "production";

    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await signGate(sample())).toBeNull();
    expect(err).toHaveBeenCalled();
  });

  it("fails closed when VERCEL_ENV is production even if NODE_ENV is not", async () => {
    delete process.env.CVOROTAVA_GATE_SECRET;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.NODE_ENV = "development";
    process.env.VERCEL_ENV = "production";

    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await signGate(sample())).toBeNull();
  });

  it("allows service-role fallback in development with a warning", async () => {
    delete process.env.CVOROTAVA_GATE_SECRET;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "dev-service-role-fallback";
    process.env.NODE_ENV = "development";
    delete process.env.VERCEL_ENV;

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const token = await signGate(sample());
    expect(token).toBeTruthy();
    expect(await verifyGate(token)).not.toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});
