import { describe, expect, it } from "vitest";
import { toDateInput, videoRecordedDate } from "@/lib/videos/date";
import { groupVideos } from "@/lib/videos/groupVideos";
import type { Video } from "@/components/videos/VideoCard";

describe("video dates", () => {
  it("keeps YYYY-MM-DD as a date input", () => {
    expect(toDateInput("2026-03-14")).toBe("2026-03-14");
    expect(toDateInput("2026-03-14T20:00:00.000Z").startsWith("2026-03-")).toBe(
      true
    );
  });

  it("prefers recorded_at over upload created_at", () => {
    expect(
      videoRecordedDate({
        recorded_at: "2026-01-10",
        created_at: "2026-09-02T00:00:00.000Z",
      })
    ).toBe("2026-01-10");
  });

  it("groups by recording month, not upload month", () => {
    const videos: Video[] = [
      {
        id: "1",
        url: "https://youtube.com/watch?v=a",
        created_at: "2026-09-02T10:00:00.000Z",
        recorded_at: "2026-03-14",
        video_type: "training",
        season: "2025/2026",
        gender: "male",
        match_id: null,
      },
    ];
    const groups = groupVideos(videos, "month");
    expect(groups).toHaveLength(1);
    expect(groups[0]?.key).toBe("2026-03");
  });
});
