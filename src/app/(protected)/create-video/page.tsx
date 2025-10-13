"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const ADMIN_EMAILS = ["siciliahernandezguillermo@gmail.com"];

export default function VideoCreatePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    url: "",
    category: "match",
    season: "",
    competition_type: "league",
    gender: "male",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session?.user?.email && ADMIN_EMAILS.includes(data.session.user.email)) {
        setIsAdmin(true);
      }
    };
    getSession();
  }, []);

  if (!session) {
    return <p className="text-center mt-10">Cargando sesión...</p>;
  }

  if (!isAdmin) {
    return <p className="text-center mt-10 text-red-600">Acceso denegado</p>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    console.log(form);

    try {
      const token = session?.access_token;
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        router.push("/");
      } else {
        throw new Error(data.error || "Error creando video");
      }

      setMessage("✅ Video creado con éxito");
      setForm({ url: "", category: "match", season: "", competition_type: "league", gender: "male" });
    } catch (err) {
      if (err instanceof Error) {
        setMessage(`❌ ${err.message}`);
      } else {
        setMessage("❌ Error desconocido");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="w-full flex flex-col items-center text-white bg-[url(/assets/svgs/circle-scatter-RB-shape.svg)] bg-center bg-fixed bg-cover p-6" style={{ minHeight: "calc(var(--vh, 1vh) * 100)" }}>
      <h1 className="text-2xl font-bold mb-6">Añadir Video</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl flex flex-col border border-white/30 overflow-hidden bg-white/5 backdrop-blur-sm shadow-lg rounded-lg p-6">
        <div>
          <label className="glass-form-label">URL de YouTube</label>
          <input
            type="text"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="glass-form-input"
            required
          />
        </div>

        <div>
          <label className="glass-form-label">Categoría</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="glass-form-input"
          >
            <option value="match">Partido</option>
            <option value="training">Entrenamiento</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="glass-form-label">Temporada</label>
            <input
              type="text"
              value={form.season}
              onChange={(e) => setForm({ ...form, season: e.target.value })}
              className="glass-form-input"
              placeholder="e.g., 2023/2024"
            />
          </div>
          <div>
            <label className="glass-form-label">Competición</label>
            <select
              value={form.competition_type}
              onChange={(e) => setForm({ ...form, competition_type: e.target.value })}
              className="glass-form-input"
            >
              <option value="league">Liga</option>
              <option value="friendly">Amistoso</option>
            </select>
          </div>
          <div>
            <label className="glass-form-label">Género</label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="glass-form-input"
            >
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
            {message && <p className="flex-1 bg-white text-xs p-2 text-red-600">{message}</p>}
            <button
                type="submit"
                disabled={loading}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
            >
                {loading ? "Guardando..." : "Guardar Video"}
            </button>
        </div>
      </form>
    </main>
  );
}
