"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MatchForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    date: "",
    time: "",
    opponent: "",
    location: "",
    season: "",
    location_url: "",
    result: "",
    video_url: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear el partido");
      }

      router.push("/calendar");
    } catch (err: Error | unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al crear el partido.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 text-[var(--text-primary)]">
      {/* Fecha y hora */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-[var(--text-secondary)]">
            Fecha *
          </label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            required
            className="w-full mt-1 p-3 border border-[var(--glass-border)] rounded-xl bg-[var(--color-bg-card)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--text-secondary)]">
            Hora *
          </label>
          <input
            type="time"
            name="time"
            value={form.time}
            onChange={handleChange}
            required
            className="w-full mt-1 p-3 border border-[var(--glass-border)] rounded-xl bg-[var(--color-bg-card)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
      </div>

      {/* Rival */}
      <div>
        <label className="block text-sm font-semibold text-[var(--text-secondary)]">
          Rival *
        </label>
        <input
          type="text"
          name="opponent"
          value={form.opponent}
          onChange={handleChange}
          required
          placeholder="Ej: Club Deportivo Alcázar"
          className="w-full mt-1 p-3 border border-[var(--glass-border)] rounded-xl bg-[var(--color-bg-card)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </div>

      {/* Lugar */}
      <div>
        <label className="block text-sm font-semibold text-[var(--text-secondary)]">
          Lugar *
        </label>
        <input
          type="text"
          name="location"
          value={form.location}
          onChange={handleChange}
          required
          placeholder="Ej: Campo Municipal Los Pinos"
          className="w-full mt-1 p-3 border border-[var(--glass-border)] rounded-xl bg-[var(--color-bg-card)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </div>

      {/* Temporada */}
      <div>
        <label className="block text-sm font-semibold text-[var(--text-secondary)]">
          Temporada *
        </label>
        <input
          type="text"
          name="season"
          value={form.season}
          onChange={handleChange}
          required
          placeholder="Ej: 2025/2026"
          className="w-full mt-1 p-3 border border-[var(--glass-border)] rounded-xl bg-[var(--color-bg-card)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </div>

      {/* URL ubicación */}
      <div>
        <label className="block text-sm font-semibold text-[var(--text-secondary)]">
          URL del lugar (Google Maps)
        </label>
        <input
          type="url"
          name="location_url"
          value={form.location_url}
          onChange={handleChange}
          placeholder="https://maps.google.com/..."
          className="w-full mt-1 p-3 border border-[var(--glass-border)] rounded-xl bg-[var(--color-bg-card)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </div>

      {/* Resultado y vídeo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-[var(--text-secondary)]">
            Resultado
          </label>
          <input
            type="text"
            name="result"
            value={form.result}
            onChange={handleChange}
            placeholder="Ej: 2-1"
            className="w-full mt-1 p-3 border border-[var(--glass-border)] rounded-xl bg-[var(--color-bg-card)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--text-secondary)]">
            URL del vídeo (YouTube)
          </label>
          <input
            type="url"
            name="video_url"
            value={form.video_url}
            onChange={handleChange}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full mt-1 p-3 border border-[var(--glass-border)] rounded-xl bg-[var(--color-bg-card)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className="block text-sm font-semibold text-[var(--text-secondary)]">
          Notas
        </label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Instrucciones o comentarios para los jugadores..."
          className="w-full mt-1 p-3 border border-[var(--glass-border)] rounded-xl bg-[var(--color-bg-card)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] min-h-[100px]"
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-center">
          {error}
        </p>
      )}

      {/* Botón */}
      <button
        type="submit"
        disabled={loading}
        className="mt-2 btn-primary py-3 px-4 rounded-xl transition disabled:opacity-50"
      >
        {loading ? "Creando..." : "Crear Partido"}
      </button>
    </form>
  );
}
