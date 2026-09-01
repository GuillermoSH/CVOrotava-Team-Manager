"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import VideosGrid from "@/components/videos/VideosGrid";
import FilterBar, { FilterConfig } from "@/components/ui/FilterBar";
import useViewportHeight from "@/hooks/useViewportHeight";
import { useUser } from "@/contexts/UserContext";
import { useSeasons } from "@/contexts/SeasonContext";
import type { Video } from "@/components/videos/VideoCard";
import type { VideoFormValues } from "@/components/videos/VideoModal";
import {
  DEFAULT_VIDEO_PAGE_SIZE,
  VIDEO_TYPE_OPTIONS,
  type VideoType,
} from "@/lib/videos/constants";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { readPref, writePref } from "@/lib/prefs";
import {
  VIDEO_GROUP_OPTIONS,
  normalizeVideoGroupPref,
  type VideoGroupBy,
} from "@/lib/videos/groupVideos";
import { videoRecordedDate } from "@/lib/videos/date";

const VideoModal = dynamic(() => import("@/components/videos/VideoModal"), {
  ssr: false,
});

type Filters = {
  season?: string;
  video_type?: VideoType;
  gender?: string;
};

const GROUP_PREF_KEY = "cvorotava-videos-group";

type VideosLibraryViewProps = {
  initialVideos: Video[];
  initialFilters: Filters;
  initialLimit?: number;
};

export default function VideosLibraryView({
  initialVideos,
  initialFilters,
  initialLimit = DEFAULT_VIDEO_PAGE_SIZE,
}: VideosLibraryViewProps) {
  const { user } = useUser();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const { seasons } = useSeasons();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<
    VideoFormValues | undefined
  >(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const [groupBy, setGroupByState] = useState<VideoGroupBy>("none");

  useViewportHeight();

  useEffect(() => {
    const stored = readPref(GROUP_PREF_KEY);
    setGroupByState(normalizeVideoGroupPref(stored));
  }, []);

  const setGroupBy = (next: VideoGroupBy) => {
    setGroupByState(next);
    writePref(GROUP_PREF_KEY, next);
  };

  const groupOptions = useMemo(
    () =>
      VIDEO_GROUP_OPTIONS.filter((opt) => {
        if (opt.value === "type" && filters.video_type) return false;
        return true;
      }),
    [filters.video_type]
  );

  useEffect(() => {
    if (!groupOptions.some((opt) => opt.value === groupBy)) {
      setGroupByState("none");
      writePref(GROUP_PREF_KEY, "none");
    }
  }, [groupOptions, groupBy]);

  const filterConfigs: FilterConfig[] = [
    {
      key: "season",
      label: "Temporada",
      options: seasons.map((s) => ({ label: s, value: s })),
    },
    {
      key: "video_type",
      label: "Tipo",
      options: VIDEO_TYPE_OPTIONS,
    },
    {
      key: "gender",
      label: "Género",
      options: [
        { label: "Masculino", value: "male" },
        { label: "Femenino", value: "female" },
      ],
    },
  ];

  return (
    <div className="w-full text-[var(--text-primary)]">
      <PageHeader
        title="Vídeos"
        subtitle="Partidos y entrenamientos grabados"
        actions={
          user?.isAdmin ? (
            <button
              type="button"
              className="btn-primary w-full touch-manipulation sm:w-auto"
              onClick={() => {
                setEditingVideo(undefined);
                setIsModalOpen(true);
              }}
            >
              <FontAwesomeIcon icon={faPlus} />
              Añadir vídeo
            </button>
          ) : null
        }
      />

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        configs={filterConfigs}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <SegmentedControl
          label="Agrupar"
          aria-label="Agrupar vídeos"
          value={groupBy}
          onChange={setGroupBy}
          options={groupOptions.map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
        />
      </div>

      <VideosGrid
        key={refreshKey}
        filters={filters}
        groupBy={groupBy}
        isAdmin={user?.isAdmin}
        initialVideos={initialVideos}
        initialFilters={initialFilters}
        initialLimit={initialLimit}
        onEdit={(v) => {
          setEditingVideo({
            id: v.id,
            url: v.url,
            video_type: v.video_type,
            season: v.season,
            gender: v.gender,
            match_id: v.match_id ?? "",
            recorded_at: videoRecordedDate(v),
          });
          setIsModalOpen(true);
        }}
      />

      {user?.isAdmin && (
        <VideoModal
          isOpen={isModalOpen}
          initialData={editingVideo}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
