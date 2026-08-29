import { supabaseAdmin } from "@/lib/supabase/admin";
import { listAuthUsersByEmail } from "@/lib/auth/authUsers";
import { normalizeEmail } from "@/lib/auth/allowlist";
import { sendNewVideoEmail } from "@/lib/email";
import { findMatchForVideoEmail } from "@/lib/videos/findMatchForVideoEmail";
import { isEligibleForVideoNotify } from "@/lib/videos/videoNotifyEligibility";
import type { VideoType } from "@/lib/videos/constants";

export async function listVideoNotifyEmails(
  gender: "male" | "female",
  excludeEmail?: string | null
): Promise<string[]> {
  const { data: profiles, error } = await supabaseAdmin
    .from("users")
    .select("id, gender, is_active");

  if (error) throw new Error(error.message);

  const eligibleIds = new Set(
    (profiles ?? [])
      .filter((p) => isEligibleForVideoNotify(p, gender))
      .map((p) => p.id)
  );

  const exclude = excludeEmail ? normalizeEmail(excludeEmail) : "";
  const emails: string[] = [];
  const authByEmail = await listAuthUsersByEmail();
  for (const u of authByEmail.values()) {
    if (!eligibleIds.has(u.id)) continue;
    if (u.email === exclude) continue;
    emails.push(u.email);
  }
  return emails;
}

/** Best-effort: never throws. Call from `after()` so the upload is not blocked. */
export async function notifyNewVideo(opts: {
  video_type: VideoType;
  url: string;
  gender: "male" | "female";
  season?: string;
  matchId?: string | null;
  excludeEmail?: string | null;
}): Promise<void> {
  try {
    const [to, match] = await Promise.all([
      listVideoNotifyEmails(opts.gender, opts.excludeEmail),
      findMatchForVideoEmail({
        matchId: opts.matchId,
        url: opts.url,
        gender: opts.gender,
        season: opts.season,
        videoType: opts.video_type,
      }),
    ]);
    await sendNewVideoEmail({
      to,
      video_type: opts.video_type,
      url: opts.url,
      gender: opts.gender,
      season: opts.season,
      match,
    });
  } catch (err) {
    console.error("notifyNewVideo failed:", err);
  }
}
