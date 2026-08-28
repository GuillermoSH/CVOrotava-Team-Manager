import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN, PLAYER } from "@/test/security/fixtures";

const redirect = vi.hoisted(() => vi.fn());
const loadAppUser = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirect(...args),
}));

vi.mock("@/lib/auth/loadAppUser", () => ({
  loadAppUser: (...args: unknown[]) => loadAppUser(...args),
}));

import { requireAdminPage } from "@/lib/auth/require-admin-page";

describe("requireAdminPage", () => {
  beforeEach(() => {
    redirect.mockReset();
    loadAppUser.mockReset();
  });

  it("sends a player home instead of rendering the admin tree", async () => {
    loadAppUser.mockResolvedValue({ ok: true, user: PLAYER });
    await requireAdminPage();
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("does not redirect a real admin", async () => {
    loadAppUser.mockResolvedValue({ ok: true, user: ADMIN });
    await requireAdminPage();
    expect(redirect).not.toHaveBeenCalled();
  });
});
