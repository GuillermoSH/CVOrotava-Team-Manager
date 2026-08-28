import { describe, expect, it, beforeAll } from "vitest";
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
  beforeAll(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-gate-secret-not-for-prod";
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
});
