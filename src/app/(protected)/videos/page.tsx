"use client";

import { useEffect, useState } from "react";
import VideosGrid from "@/components/videos/VideosGrid";
import FilterBar, { FilterConfig } from "@/components/ui/FilterBar";
import useViewportHeight from "@/hooks/useViewportHeight";
import { getCurrentSeason } from "@/utils/getCurrentSeason";
import { useUser } from "@/contexts/UserContext";
import { useSeasons } from "@/contexts/SeasonContext";
import VideoModal, { VideoFormValues } from "@/components/videos/VideoModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

type Filters = {
  season?: string;
  competition_type?: string;
  gender?: string;
  category?: "match" | "training";
};

export default function PartidosPage() {
  const {user } = useUser();
  const [filters, setFilters] = useState<Filters>({
    season: getCurrentSeason(),
    gender: user?.gender ?? undefined,
  });
  const { seasons } = useSeasons();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoFormValues | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  useViewportHeight();

  useEffect(() => {
    if (!filters.gender && user?.gender) {
      setFilters((prev) => ({ ...prev, gender: user.gender! }));
    }
  }, [user]);

  const filterConfigs: FilterConfig[] = [
    {
      key: "season",
      label: "Temporada",
      options: seasons.map((s) => ({ label: s, value: s })),
    },
    {
      key: "category",
      label: "Categoría",
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
    <main className="w-full max-w-6xl py-4">
      <div className="mb-6 flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl text-white font-bold mb-1">🎥 Videos</h1>
          <p className="text-sm text-[var(--text-muted)]">Partidos y entrenamientos grabados</p>
        </div>
        {user?.isAdmin && (
          <button 
            type="button" 
            className="btn-primary flex items-center gap-2"
            onClick={() => {
              setEditingVideo(undefined);
              setIsModalOpen(true);
            }}
          >
            <FontAwesomeIcon icon={faPlus} /> Añadir Vídeo
          </button>
        )}
      </div>

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        configs={filterConfigs}
      />
      <VideosGrid 
        key={refreshKey}
        filters={filters} 
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
          onSuccess={() => setRefreshKey(k => k + 1)}
        />
      )}
    </main>
  );
}
