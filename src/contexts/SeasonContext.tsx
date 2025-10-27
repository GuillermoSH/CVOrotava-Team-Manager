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

export function SeasonProvider({ children }: { children: React.ReactNode }) {
  const [seasons, setSeasons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

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
    fetchSeasons();
  }, []);

  return (
    <SeasonContext.Provider value={{ seasons, loading, refreshSeasons: fetchSeasons }}>
      {children}
    </SeasonContext.Provider>
  );
}

export const useSeasons = () => useContext(SeasonContext);
