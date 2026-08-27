"use client";

import { useEffect, useMemo, useState } from "react";
import VideosGrid from "@/components/videos/VideosGrid";
import FilterBar, { FilterConfig } from "@/components/ui/FilterBar";
import useViewportHeight from "@/hooks/useViewportHeight";
import { getCurrentSeason } from "@/utils/getCurrentSeason";
import { useUser } from "@/contexts/UserContext";
import { useSeasons } from "@/contexts/SeasonContext";
import VideoModal, { VideoFormValues } from "@/components/videos/VideoModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { readPref, writePref } from "@/lib/prefs";
import {
  VIDEO_GROUP_OPTIONS,
  type VideoGroupBy,
} from "@/lib/videos/groupVideos";

type Filters = {
  season?: string;
  competition_type?: string;
  gender?: string;
  category?: "match" | "training";
};

const GROUP_PREF_KEY = "cvorotava-videos-group";

function isVideoGroupBy(value: string | null): value is VideoGroupBy {
  return (
    value === "none" ||
    value === "category" ||
    value === "month" ||
    value === "competition"
  );
}

export default function VideosPage() {
  const { user } = useUser();
  const [filters, setFilters] = useState<Filters>({
    season: getCurrentSeason(),
    gender: user?.gender ?? undefined,
  });
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
    if (isVideoGroupBy(stored)) setGroupByState(stored);
  }, []);

  const setGroupBy = (next: VideoGroupBy) => {
    setGroupByState(next);
    writePref(GROUP_PREF_KEY, next);
  };

  const groupOptions = useMemo(
    () =>
      VIDEO_GROUP_OPTIONS.filter((opt) => {
        if (opt.value === "category" && filters.category) return false;
        if (opt.value === "competition" && filters.competition_type)
          return false;
        return true;
      }),
    [filters.category, filters.competition_type]
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
      key: "category",
      label: "Tipo",
      options: [
        { label: "Partido", value: "match" },
        { label: "Entrenamiento", value: "training" },
      ],
    },
    {
      key: "competition_type",
      label: "Competición",
      options: [
        { label: "Liga", value: "league" },
        { label: "Amistoso", value: "friendly" },
      ],
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
        onEdit={(v) => {
          setEditingVideo({
            id: v.id,
            url: v.url,
            category: v.category,
            season: v.season,
            competition_type: v.competition_type,
            gender: v.gender,
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
