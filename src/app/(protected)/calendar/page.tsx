'use client';

import { useEffect, useState } from 'react';
import MatchCard from '@/components/calendar/MatchCard';

type Match = {
  id: string;
  date: string;
  time: string;
  opponent: string;
  location: string;
  location_url?: string;
  result?: string;
  video_url?: string;
  season: string;
  notes?: string;
};

export default function CalendarioPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await fetch('/api/matches');
        if (!res.ok) throw new Error('Error al obtener partidos');
        const data = await res.json();
        setMatches(data);
          } catch (err: unknown) {
        console.error(err);
        setError('No se pudo cargar el calendario.');
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  if (loading) {
    return (
      <main className="flex justify-center items-center min-h-screen bg-[url(/assets/svgs/circle-scatter-RB-shape.svg)] bg-center bg-cover">
        <p className="text-white text-lg">Cargando partidos...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex justify-center items-center min-h-screen bg-[url(/assets/svgs/circle-scatter-RB-shape.svg)] bg-center bg-cover">
        <p className="text-red-500">{error}</p>
      </main>
    );
  }

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold text-white text-center mb-8">
        📅 Calendario de Partidos
      </h1>

      {matches.length === 0 ? (
        <p className="text-center text-gray-100">No hay partidos registrados.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </main>
  );
}
