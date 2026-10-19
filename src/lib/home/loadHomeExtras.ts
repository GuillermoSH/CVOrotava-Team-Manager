import { supabaseAdmin } from "@/lib/supabase/admin";
import { listVideos, type VideoListItem } from "@/lib/videos/listVideos";
import { listAllowedEmails } from "@/lib/access/listAllowedEmails";
import { isRegisteredAccess } from "@/lib/auth/allowedEmails";
import { getLastFedSync } from "@/lib/fed/lastSync";
import { loadSeasonData } from "@/lib/stats/competitive/load";
import { todayInCanarias } from "@/lib/stats/competitive/seasons";
import type { Gender } from "@/lib/stats/competitive/types";
import { pendingDocs, upcomingBirthdays, type BirthdayRow, type PlayerDocsRow } from "./adminPending";
import type { AdminPendingData } from "./loadAdminPending.types";
import { buildWeekendRoundup, type WeekendRoundup } from "./weekendRoundup";

export const HOME_VIDEO_COUNT = 4;

export function loadLatestVideos(gender: string | null): Promise<VideoListItem[]> {
  return listVideos({ gender, limit: HOME_VIDEO_COUNT });
}

/** Jornada más reciente de la liga con nuestro partido y los del resto de equipos. */
export async function loadWeekendRoundup(season: string, gender: Gender): Promise<WeekendRoundup | null> {
  const data = await loadSeasonData(season, gender);
  return data ? buildWeekendRoundup(data, todayInCanarias()) : null;
}

/**
 * Pendientes del admin. «Jugadores» son los dados de alta en la app: los que tienen
 * cuenta enlazada (`players.user_id`) y están activos esta temporada.
 * Solo para admins: el llamador debe haber comprobado `isAdmin`.
 */
export async function loadAdminPending(season: string): Promise<AdminPendingData> {
  const [playersRes, allowed, venuesRes, lastSync] = await Promise.all([
    supabaseAdmin
      .from("players")
      .select("id, full_name, birth_date, license_completed, registration_papers_received, photo_consent")
      .eq("season", season)
      .eq("is_active", true)
      .not("user_id", "is", null),
    listAllowedEmails(),
    supabaseAdmin.from("venues").select("id", { count: "exact", head: true }).eq("needs_review", true),
    getLastFedSync(),
  ]);
  if (playersRes.error) throw new Error(`players: ${playersRes.error.message}`);
  if (venuesRes.error) throw new Error(`venues: ${venuesRes.error.message}`);

  const players = (playersRes.data ?? []) as (PlayerDocsRow & BirthdayRow)[];
  const invited = allowed.filter((r) => !isRegisteredAccess(r)).map((r) => r.email);

  return {
    docs: pendingDocs(players),
    birthdays: upcomingBirthdays(players, todayInCanarias()),
    invited: { count: invited.length, emails: invited.slice(0, 5) },
    venuesToReview: venuesRes.count ?? 0,
    lastSync,
  };
}
