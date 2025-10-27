"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FormLayout,
  FormInput,
  FormDate,
  FormTime,
  FormSelect,
} from "@/components/ui/forms";

type Match = {
  id: string;
  date: string;
  time: string;
  opponent: string;
  season: string;
  result?: string;
  video_url?: string;
  notes?: string;
  gender: "male" | "female";
  venue_id: string;
  match_sets?: MatchSet[];
};

type MatchSet = {
  id?: string;
  match_id?: string;
  set_number: number;
  team_score: number;
  opponent_score: number;
};

type Venue = {
  id: string;
  venue_name: string;
  location_type: "home" | "away" | "outside_island";
};

export default function EditMatchPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [match, setMatch] = useState<Match | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [sets, setSets] = useState<MatchSet[]>([]);
  const [loading, setLoading] = useState(true);

  // 🧩 Cargar datos del partido y los pabellones
  useEffect(() => {
    async function fetchData() {
      try {
        const [matchRes, venueRes] = await Promise.all([
          fetch(`/api/matches/${id}`),
          fetch(`/api/venues`),
        ]);

        if (!matchRes.ok) throw new Error("Error al cargar partido");
        const matchData = await matchRes.json();
        const venueData = await venueRes.json();

        setMatch(matchData);
        setVenues(venueData);
        setSets(matchData.match_sets || []);
      } catch (err) {
        console.error(err);
        alert("Error cargando los datos del partido");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  // 🧱 Funciones para manejar los sets
  const handleSetChange = (index: number, field: "set_number" | "team_score" | "opponent_score", value: number) => {
    const updated = [...sets];
    updated[index] = { ...updated[index], [field]: value };
    setSets(updated);
  };

  const addSet = () => {
    setSets([
      ...sets,
      { set_number: sets.length + 1, team_score: 0, opponent_score: 0 },
    ]);
  };

  const removeSet = (index: number) => {
    const updated = sets.filter((_, i) => i !== index);
    setSets(updated.map((s, i) => ({ ...s, set_number: i + 1 })));
  };

  // 🧩 Guardar cambios
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!match) return;

    try {
      setLoading(true);

      // 1️⃣ Actualizamos el partido
      const matchRes = await fetch(`/api/matches/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(match),
      });

      if (!matchRes.ok) throw new Error("Error al actualizar el partido");

      // 2️⃣ Actualizamos los sets
      const setRes = await fetch(`/api/match_sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          sets.map((s) => ({
            ...s,
            match_id: id,
          }))
        ),
      });

      if (!setRes.ok) throw new Error("Error al actualizar los sets");

      alert("✅ Partido actualizado correctamente");
      router.push("/calendar");
    } catch (err) {
      console.error(err);
      alert("❌ Error guardando los cambios");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p className="text-center text-white mt-10">Cargando...</p>;
  if (!match) return <p className="text-center text-red-500 mt-10">Partido no encontrado</p>;

  return (
    <main className="flex justify-center w-full px-2 py-4 md:px-4 md:py-10">
      <div className="w-full max-w-3xl">
        <FormLayout
          title="🏐 Editar Partido"
          description="Modifica los datos del partido y los sets."
          onSubmit={handleSubmit}
          loading={loading}
          buttonText="Guardar Cambios"
        >
          {/* 🗓️ Fecha y hora */}
          <div className="grid grid-cols-2 gap-4">
            <FormDate
              label="Fecha *"
              name="date"
              value={match.date}
              onChange={(e) => setMatch({ ...match, date: e.target.value })}
            />
            <FormTime
              label="Hora *"
              name="time"
              value={match.time}
              onChange={(e) => setMatch({ ...match, time: e.target.value })}
            />
          </div>

          {/* Rival + Género */}
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Rival *"
              name="opponent"
              value={match.opponent}
              onChange={(e) => setMatch({ ...match, opponent: e.target.value })}
            />
            <FormSelect
              label="Género *"
              name="gender"
              value={match.gender}
              onChange={(e) => setMatch({ ...match, gender: e.target.value as "male" | "female" })}
              options={[
                { value: "male", label: "Masculino" },
                { value: "female", label: "Femenino" },
              ]}
            />
          </div>

          {/* Pabellón + Temporada */}
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Pabellón *"
              name="venue_id"
              value={match.venue_id}
              onChange={(e) => setMatch({ ...match, venue_id: e.target.value })}
              options={venues.map((v) => ({
                value: v.id,
                label: `${v.venue_name} (${v.location_type})`,
              }))}
            />
            <FormInput
              label="Temporada *"
              name="season"
              value={match.season}
              onChange={(e) => setMatch({ ...match, season: e.target.value })}
            />
          </div>

          {/* Vídeo, resultado, notas */}
          <FormInput
            label="URL vídeo (YouTube)"
            name="video_url"
            type="url"
            value={match.video_url || ""}
            onChange={(e) => setMatch({ ...match, video_url: e.target.value })}
          />

          <FormInput
            label="Resultado (manual, opcional)"
            name="result"
            value={match.result || ""}
            onChange={(e) => setMatch({ ...match, result: e.target.value })}
          />

          <FormInput
            label="Notas"
            name="notes"
            value={match.notes || ""}
            onChange={(e) => setMatch({ ...match, notes: e.target.value })}
          />

          {/* 🏐 Edición de Sets */}
          <div className="mt-6">
            <h3 className="text-gray-700 font-semibold mb-3">Sets del Partido</h3>
            <div className="flex flex-col gap-2">
              {sets.map((set, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-xl"
                >
                  <span className="text-sm text-gray-700 w-14">Set {set.set_number}</span>
                  <input
                    type="number"
                    min={0}
                    className="w-16 text-center rounded-lg p-1 text-black"
                    value={set.team_score}
                    onChange={(e) => handleSetChange(i, "team_score", Number(e.target.value))}
                  />
                  <span className="text-white">-</span>
                  <input
                    type="number"
                    min={0}
                    className="w-16 text-center rounded-lg p-1 text-black"
                    value={set.opponent_score}
                    onChange={(e) => handleSetChange(i, "opponent_score", Number(e.target.value))}
                  />
                  <button
                    type="button"
                    onClick={() => removeSet(i)}
                    className="text-red-400 text-xs hover:underline ml-2"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addSet}
              className="text-blue-400 text-sm mt-3 hover:underline"
            >
              + Añadir Set
            </button>
          </div>
        </FormLayout>
      </div>
    </main>
  );
}
