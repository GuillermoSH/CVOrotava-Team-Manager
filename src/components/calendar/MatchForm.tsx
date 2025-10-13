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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 text-gray-800">
      {/* Fecha y hora */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700">
            Fecha *
          </label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            required
            className="w-full mt-1 p-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700">
            Hora *
          </label>
          <input
            type="time"
            name="time"
            value={form.time}
            onChange={handleChange}
            required
            className="w-full mt-1 p-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Rival */}
      <div>
        <label className="block text-sm font-semibold text-gray-700">
          Rival *
        </label>
        <input
          type="text"
          name="opponent"
          value={form.opponent}
          onChange={handleChange}
          required
          placeholder="Ej: Club Deportivo Alcázar"
          className="w-full mt-1 p-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      {/* Lugar */}
      <div>
        <label className="block text-sm font-semibold text-gray-700">
          Lugar *
        </label>
        <input
          type="text"
          name="location"
          value={form.location}
          onChange={handleChange}
          required
          placeholder="Ej: Campo Municipal Los Pinos"
          className="w-full mt-1 p-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      {/* Temporada */}
      <div>
        <label className="block text-sm font-semibold text-gray-700">
          Temporada *
        </label>
        <input
          type="text"
          name="season"
          value={form.season}
          onChange={handleChange}
          required
          placeholder="Ej: 2025/2026"
          className="w-full mt-1 p-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      {/* URL ubicación */}
      <div>
        <label className="block text-sm font-semibold text-gray-700">
          URL del lugar (Google Maps)
        </label>
        <input
          type="url"
          name="location_url"
          value={form.location_url}
          onChange={handleChange}
          placeholder="https://maps.google.com/..."
          className="w-full mt-1 p-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      {/* Resultado y vídeo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700">
            Resultado
          </label>
          <input
            type="text"
            name="result"
            value={form.result}
            onChange={handleChange}
            placeholder="Ej: 2-1"
            className="w-full mt-1 p-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700">
            URL del vídeo (YouTube)
          </label>
          <input
            type="url"
            name="video_url"
            value={form.video_url}
            onChange={handleChange}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full mt-1 p-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className="block text-sm font-semibold text-gray-700">
          Notas
        </label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Instrucciones o comentarios para los jugadores..."
          className="w-full mt-1 p-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[100px]"
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 text-center">
          {error}
        </p>
      )}

      {/* Botón */}
      <button
        type="submit"
        disabled={loading}
        className="mt-2 bg-gradient-to-r from-blue-700 to-blue-900 text-white font-semibold py-3 px-4 rounded-xl hover:opacity-90 transition disabled:opacity-50"
      >
        {loading ? "Creando..." : "Crear Partido"}
      </button>
    </form>
  );
}
