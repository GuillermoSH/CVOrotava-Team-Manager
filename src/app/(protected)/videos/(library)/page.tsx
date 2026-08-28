import VideosLibraryView from "./VideosLibraryView";
import { requireAppUser } from "@/lib/auth/loadAppUser";
import {
  DEFAULT_VIDEO_PAGE_SIZE,
  listVideos,
} from "@/lib/videos/listVideos";
import { getCurrentSeason } from "@/utils/getCurrentSeason";

export default async function VideosPage() {
  const user = await requireAppUser();
  const season = getCurrentSeason();
  const initialFilters = {
    season,
    gender: user.gender ?? undefined,
  };

  const initialVideos = await listVideos({
    ...initialFilters,
    page: 1,
    limit: DEFAULT_VIDEO_PAGE_SIZE,
  });

  return (
    <VideosLibraryView
      initialVideos={initialVideos}
      initialFilters={initialFilters}
      initialLimit={DEFAULT_VIDEO_PAGE_SIZE}
    />
  );
}
