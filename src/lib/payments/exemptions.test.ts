import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: {} }));

import { isMissingTableError } from "./exemptions";

describe("isMissingTableError", () => {
  it("reconoce la tabla inexistente de Postgres y de PostgREST", () => {
    expect(isMissingTableError({ code: "42P01" })).toBe(true);
    expect(isMissingTableError({ code: "PGRST205", message: "x" })).toBe(true);
    expect(
      isMissingTableError({ message: "Could not find the table 'public.payment_exemptions' in the schema cache" })
    ).toBe(true);
  });
  it("no confunde otros errores ni la ausencia de error", () => {
    expect(isMissingTableError({ code: "23505", message: "duplicate key" })).toBe(false);
    expect(isMissingTableError(null)).toBe(false);
    expect(isMissingTableError(undefined)).toBe(false);
  });
});
