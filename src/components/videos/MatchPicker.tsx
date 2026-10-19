"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import Select from "@/components/ui/Select";
import { formatMatchPickerLabel } from "@/lib/matches/formatMatchLabel";

type MatchOption = {
  id: string;
  date: string;
  opponent: string;
  result?: string | null;
};

type MatchPickerProps = {
  season: string;
  gender: string;
  value: string;
  onChange: (matchId: string, match?: MatchOption | null) => void;
  forMatchId?: string;
  disabled?: boolean;
  label?: string;
};

export default function MatchPicker({
  season,
  gender,
  value,
  onChange,
  forMatchId,
  disabled,
  label = "Partido vinculado",
}: Readonly<MatchPickerProps>) {
  const requestKey =
    season && gender ? `${season}|${gender}|${forMatchId ?? ""}` : null;
  const [result, setResult] = useState<{
    key: string | null;
    data: MatchOption[];
  }>({ key: null, data: [] });
  const loading = requestKey !== null && result.key !== requestKey;
  const matches = requestKey !== null && result.key === requestKey ? result.data : [];

  useEffect(() => {
    if (!season || !gender) return;
    const key = `${season}|${gender}|${forMatchId ?? ""}`;
    let cancelled = false;

    const params = new URLSearchParams({
      season,
      gender,
      withoutVideo: "true",
      order: "desc",
    });
    if (forMatchId) params.set("forMatchId", forMatchId);

    fetch(`/api/matches?${params}`)
      .then((res) => (res.ok ? res.json() : []))
      .catch(() => [])
      .then((data: MatchOption[]) => {
        if (!cancelled) setResult({ key, data });
      });
    return () => {
      cancelled = true;
    };
  }, [season, gender, forMatchId]);

  const options = [
    { value: "", label: "Sin vincular" },
    ...matches.map((m) => ({
      value: m.id,
      label: formatMatchPickerLabel(m),
    })),
  ];

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-[var(--text-secondary)]">
        {label}
      </span>
      {loading ? (
        <div className="flex h-10 items-center gap-2 rounded-lg border border-[var(--glass-border)] bg-[var(--color-bg-card)] px-3 text-xs text-[var(--text-muted)]">
          <FontAwesomeIcon icon={faSpinner} spin />
          Cargando partidos…
        </div>
      ) : (
        <Select
          value={value}
          onChange={(id) =>
            onChange(
              id,
              id ? (matches.find((m) => m.id === id) ?? null) : null
            )
          }
          options={options}
          placeholder="Selecciona un partido"
          disabled={disabled || !season || !gender}
        />
      )}
    </div>
  );
}
