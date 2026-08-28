"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import Select from "@/components/ui/Select";
import { VIDEO_TYPE_LABELS, type VideoType } from "@/lib/videos/constants";

type VideoOption = {
  id: string;
  url: string;
  video_type: VideoType;
};

type VideoPickerProps = {
  season: string;
  gender: string;
  value: string;
  onChange: (videoId: string, url: string) => void;
  forMatchId?: string;
  disabled?: boolean;
  label?: string;
};

export default function VideoPicker({
  season,
  gender,
  value,
  onChange,
  forMatchId,
  disabled,
  label = "Vídeo de la biblioteca",
}: Readonly<VideoPickerProps>) {
  const [videos, setVideos] = useState<VideoOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!season || !gender) {
      setVideos([]);
      setLoading(false);
      return;
    }

    const params = new URLSearchParams({
      season,
      gender,
      withoutMatch: "true",
      matchVideosOnly: "true",
    });
    if (forMatchId) params.set("forMatchId", forMatchId);

    setLoading(true);
    fetch(`/api/videos?${params}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: VideoOption[]) => setVideos(data))
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, [season, gender, forMatchId]);

  const options = [
    { value: "", label: "Sin vídeo / URL manual" },
    ...videos.map((v) => ({
      value: v.id,
      label: `${VIDEO_TYPE_LABELS[v.video_type]} — ${v.url.replace(/^https?:\/\//, "").slice(0, 48)}${v.url.length > 56 ? "…" : ""}`,
    })),
  ];

  const handleChange = (videoId: string) => {
    const found = videos.find((v) => v.id === videoId);
    onChange(videoId, found?.url ?? "");
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-[var(--text-secondary)]">
        {label}
      </span>
      {loading ? (
        <div className="flex h-10 items-center gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--color-bg-card)] px-3 text-xs text-[var(--text-muted)]">
          <FontAwesomeIcon icon={faSpinner} spin />
          Cargando vídeos…
        </div>
      ) : (
        <Select
          value={value}
          onChange={handleChange}
          options={options}
          placeholder="Selecciona un vídeo"
          disabled={disabled || !season || !gender}
        />
      )}
    </div>
  );
}
