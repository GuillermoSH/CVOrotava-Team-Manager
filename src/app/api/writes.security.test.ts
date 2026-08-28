import { beforeEach, describe, expect, it, vi } from "vitest";
import { PLAYER } from "@/test/security/fixtures";
import { createQueryChain } from "@/test/security/queryChain";

const requireAllowedUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/require-allowed-user", () => ({
  requireAllowedUser: (...args: unknown[]) => requireAllowedUser(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: vi.fn(async () => ({})),
}));

const from = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: (...args: unknown[]) => from(...args) },
}));

vi.mock("@/lib/ensureVideoFromMatchUrl", () => ({
  ensureVideoFromMatchUrl: vi.fn(async () => {}),
}));

vi.mock("@/lib/matches/getMatchById", () => ({
  getMatchById: vi.fn(),
}));

import { POST } from "@/app/api/matches/route";
import { PUT, DELETE } from "@/app/api/matches/[id]/route";
import { POST as POST_SETS } from "@/app/api/match_sets/route";
import { POST as POST_VIDEO, GET as GET_VIDEO } from "@/app/api/videos/route";
import { PUT as PUT_VIDEO, DELETE as DELETE_VIDEO } from "@/app/api/videos/[id]/route";

const matchBody = {
  date: "2026-01-01",
  time: "20:00",
  opponent: "Rival",
  season: "2025/2026",
  gender: "male",
  venue_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
};

describe("club writes as a player must not touch supabaseAdmin", () => {
  beforeEach(() => {
    requireAllowedUser.mockReset();
    requireAllowedUser.mockResolvedValue({ user: PLAYER });
    from.mockReset();
    from.mockReturnValue(createQueryChain({ data: { id: "x" }, error: null }));
  });

  it("POST /api/matches", async () => {
    const res = await POST(
      new Request("http://local/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(matchBody),
      })
    );
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it("PUT /api/matches/[id]", async () => {
    const res = await PUT(new Request("http://local/api/matches/id", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(matchBody) }), {
      params: Promise.resolve({ id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" }),
    });
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it("DELETE /api/matches/[id]", async () => {
    const res = await DELETE(
      new Request("http://local/api/matches/id", { method: "DELETE" }),
      { params: Promise.resolve({ id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" }) }
    );
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it("POST /api/match_sets", async () => {
    const res = await POST_SETS(
      new Request("http://local/api/match_sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          { match_id: "m", set_number: 1, team_score: 25, opponent_score: 20 },
        ]),
      })
    );
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it("POST /api/videos even with a Bearer token (old path)", async () => {
    const res = await POST_VIDEO(
      new Request("http://local/api/videos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer stolen-access-token",
        },
        body: JSON.stringify({
          url: "https://youtube.com/watch?v=dQw4w9wgGcQ",
          video_type: "league_match",
        }),
      })
    );
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it("PUT /api/videos/[id]", async () => {
    const res = await PUT_VIDEO(
      new Request("http://local/api/videos/id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://youtube.com/watch?v=x" }),
      }),
      { params: Promise.resolve({ id: "cccccccc-cccc-cccc-cccc-cccccccccccc" }) }
    );
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it("DELETE /api/videos/[id]", async () => {
    const res = await DELETE_VIDEO(
      new Request("http://local/api/videos/id", { method: "DELETE" }),
      { params: Promise.resolve({ id: "cccccccc-cccc-cccc-cccc-cccccccccccc" }) }
    );
    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it("GET /api/videos still works for a player (read is club-shared)", async () => {
    const chain = createQueryChain({ data: [], error: null });
    from.mockReturnValue(chain);
    const res = await GET_VIDEO(new Request("http://local/api/videos?limit=1"));
    expect(res.status).toBe(200);
    expect(from).toHaveBeenCalledWith("videos");
  });
});
