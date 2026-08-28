// src/contexts/SeasonContext.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";

type SeasonContextType = {
  seasons: string[];
  loading: boolean;
  refreshSeasons: () => Promise<void>;
};

const SeasonContext = createContext<SeasonContextType>({
  seasons: [],
  loading: true,
  refreshSeasons: async () => {},
});

export function SeasonProvider({
  children,
  initialSeasons,
}: {
  children: React.ReactNode;
  initialSeasons?: string[];
}) {
  const [seasons, setSeasons] = useState<string[]>(initialSeasons ?? []);
  const [loading, setLoading] = useState(!initialSeasons);

  const fetchSeasons = async () => {
    try {
      const res = await fetch("/api/seasons");
      const data = await res.json();
      setSeasons(data);
    } catch (err) {
      console.error("Error cargando temporadas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialSeasons) return;
    fetchSeasons();
    // Initial list comes from the protected layout RSC.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SeasonContext.Provider value={{ seasons, loading, refreshSeasons: fetchSeasons }}>
      {children}
    </SeasonContext.Provider>
  );
}

export const useSeasons = () => useContext(SeasonContext);
