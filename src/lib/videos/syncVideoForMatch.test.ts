import { beforeEach, describe, expect, it, vi } from "vitest";

const from = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: (...args: unknown[]) => from(...args) },
}));

import { linkVideoToMatch, syncVideoForMatch } from "@/lib/videos/syncVideoForMatch";

function chain(result: { data?: unknown; error?: unknown }) {
  const self = {
    select: vi.fn(() => self),
    eq: vi.fn(() => self),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
    update: vi.fn(() => self),
    insert: vi.fn(async () => result),
  };
  return self;
}

describe("syncVideoForMatch", () => {
  beforeEach(() => {
    from.mockReset();
  });

  it("clears video link when url is empty", async () => {
    const clearChain = chain({ error: null });
    const matchChain = chain({ error: null });
    from.mockReturnValueOnce(clearChain).mockReturnValueOnce(matchChain);

    await syncVideoForMatch({
      matchId: "match-1",
      videoUrl: "",
      season: "2025/2026",
      gender: "male",
    });

    expect(clearChain.update).toHaveBeenCalledWith({ match_id: null });
    expect(matchChain.update).toHaveBeenCalledWith({ video_url: null });
  });

  it("inserts new video when url not found", async () => {
    const clearChain = chain({ error: null });
    const selectChain = chain({ data: null, error: null });
    const insertChain = chain({ error: null });
    const matchChain = chain({ error: null });

    from
      .mockReturnValueOnce(clearChain)
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(matchChain);

    await syncVideoForMatch({
      matchId: "match-1",
      videoUrl: "https://youtube.com/watch?v=abc",
      season: "2025/2026",
      gender: "male",
    });

    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://youtube.com/watch?v=abc",
        match_id: "match-1",
        video_type: "league_match",
      })
    );
  });
});

describe("linkVideoToMatch", () => {
  beforeEach(() => {
    from.mockReset();
  });

  it("rejects training videos", async () => {
    from.mockReturnValue(
      chain({
        data: {
          id: "v1",
          url: "https://youtube.com/watch?v=x",
          video_type: "training",
          season: "2025/2026",
          gender: "male",
          match_id: null,
        },
        error: null,
      })
    );

    const result = await linkVideoToMatch({ videoId: "v1", matchId: "m1" });
    expect(result.error).toMatch(/partido/i);
  });
});
