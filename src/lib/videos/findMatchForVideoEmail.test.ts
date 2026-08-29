import { beforeEach, describe, expect, it, vi } from "vitest";

const from = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: (...args: unknown[]) => from(...args) },
}));

import { findMatchForVideoEmail } from "@/lib/videos/findMatchForVideoEmail";

function chain(result: { data?: unknown; error?: unknown }) {
  const self = {
    select: vi.fn(() => self),
    eq: vi.fn(() => self),
    not: vi.fn(() => self),
    neq: vi.fn(() => self),
    order: vi.fn(() => self),
    limit: vi.fn(() => self),
    maybeSingle: vi.fn(async () => result),
  };
  Object.assign(self, {
    then: (
      onFulfilled: (value: { data?: unknown; error?: unknown }) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  });
  return self;
}

const sample = {
  id: "match-1",
  date: "2026-03-14",
  time: "20:00",
  opponent: "CV Tacoronte",
  season: "2025/2026",
  result: "3-1",
  gender: "male",
  video_url: null,
  venues: { venue_name: "Pabellón", location_type: "home" },
  match_sets: [{ set_number: 1, team_score: 25, opponent_score: 20 }],
};

describe("findMatchForVideoEmail", () => {
  beforeEach(() => {
    from.mockReset();
  });

  it("loads the linked match by id first", async () => {
    from.mockReturnValueOnce(chain({ data: sample, error: null }));

    const match = await findMatchForVideoEmail({
      matchId: "match-1",
      url: "https://youtu.be/abc",
      gender: "male",
      season: "2025/2026",
      videoType: "league_match",
    });

    expect(match?.opponent).toBe("CV Tacoronte");
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("finds a match that already has this video url", async () => {
    from.mockReturnValueOnce(
      chain({
        data: { ...sample, video_url: "https://youtu.be/abc" },
        error: null,
      })
    );

    const match = await findMatchForVideoEmail({
      url: "https://youtu.be/abc",
      gender: "male",
      season: "2025/2026",
      videoType: "league_match",
    });

    expect(match?.id).toBe("match-1");
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("uses the only league match still without a video", async () => {
    const list = chain({
      data: [sample, { ...sample, id: "match-2", video_url: "https://other" }],
      error: null,
    });
    from
      .mockReturnValueOnce(chain({ data: null, error: null }))
      .mockReturnValueOnce(list);

    const match = await findMatchForVideoEmail({
      url: "https://youtu.be/abc",
      gender: "male",
      season: "2025/2026",
      videoType: "league_match",
    });

    expect(match?.id).toBe("match-1");
  });

  it("does not guess when several league matches lack a video", async () => {
    const list = chain({
      data: [sample, { ...sample, id: "match-2", opponent: "Otro" }],
      error: null,
    });
    from
      .mockReturnValueOnce(chain({ data: null, error: null }))
      .mockReturnValueOnce(list);

    const match = await findMatchForVideoEmail({
      url: "https://youtu.be/abc",
      gender: "male",
      season: "2025/2026",
      videoType: "league_match",
    });

    expect(match).toBeNull();
  });

  it("does not guess a calendar match for trainings", async () => {
    from.mockReturnValueOnce(chain({ data: null, error: null }));

    const match = await findMatchForVideoEmail({
      url: "https://youtu.be/abc",
      gender: "male",
      season: "2025/2026",
      videoType: "training",
    });

    expect(match).toBeNull();
    expect(from).toHaveBeenCalledTimes(1);
  });
});
