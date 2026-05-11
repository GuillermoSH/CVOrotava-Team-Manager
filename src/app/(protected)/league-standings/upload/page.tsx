"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCloudArrowUp,
  faTableList,
  faCircleCheck,
  faCircleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { useUser } from "@/contexts/UserContext";
import { useSeasons } from "@/contexts/SeasonContext";
import { getCurrentSeason } from "@/utils/getCurrentSeason";
import PageHeader from "@/components/ui/PageHeader";
import AliasResolver, {
  type StandingOption,
  type UnmatchedRow,
} from "@/components/standings/AliasResolver";

type ImportRow = {
  id: string;
  position: number;
  team_name: string;
  normalized_name: string;
  is_our_team: boolean;
  league_points: number;
};

type ImportResponse = {
  inserted: number;
  warnings: string[];
  headers: string[];
  rows: ImportRow[];
};

type TierStats = {
  played: number;
  won: number;
  lost: number;
  league_points: number;
  max_possible_points: number;
};

type OpponentTierResponse = {
  has_standings: boolean;
  tiers: Record<"top" | "mid" | "bottom", TierStats> | null;
  unmatched_opponents: UnmatchedRow[];
};

export default function LeagueStandingsUploadPage() {
  const router = useRouter();
  const { user } = useUser();
  const { seasons, refreshSeasons } = useSeasons();

  const [season, setSeason] = useState<string>(getCurrentSeason());
  const [gender, setGender] = useState<"male" | "female">(
    (user?.gender as "male" | "female" | undefined) ?? "male"
  );
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [unmatched, setUnmatched] = useState<UnmatchedRow[]>([]);
  const [candidates, setCandidates] = useState<StandingOption[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const seasonOptions = useMemo(() => {
    const set = new Set<string>([getCurrentSeason(), ...seasons, season]);
    return Array.from(set)
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));
  }, [seasons, season]);

  const refreshUnmatched = useCallback(
    async (s: string, g: string) => {
      const res = await fetch(`/api/stats/opponent-tier?season=${s}&gender=${g}`);
      if (!res.ok) return;
      const data = (await res.json()) as OpponentTierResponse;
      setUnmatched(data.unmatched_opponents ?? []);
    },
    []
  );

  const refreshCandidates = useCallback(async (s: string, g: string) => {
    const res = await fetch(`/api/league-standings?season=${s}&gender=${g}`);
    if (!res.ok) return;
    const json = await res.json();
    const data: ImportRow[] = json.data ?? [];
    setCandidates(
      data
        .filter((r) => !r.is_our_team)
        .map((r) => ({
          normalized_name: r.normalized_name,
          team_name: r.team_name,
        }))
    );
  }, []);

  useEffect(() => {
    if (importResult) {
      refreshUnmatched(season, gender);
      refreshCandidates(season, gender);
    }
  }, [importResult, season, gender, refreshUnmatched, refreshCandidates]);

  if (user && !user.isAdmin) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-sm font-semibold text-red-400">
        Acceso denegado. Solo administradores.
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!file) {
      setMessage({ type: "error", text: "Selecciona un archivo .xls o .xlsx." });
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("season", season);
      fd.set("gender", gender);

      const res = await fetch("/api/league-standings/import", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        const text =
          typeof json.error === "string"
            ? json.error
            : "No se pudo importar la clasificación.";
        throw new Error(text);
      }
      setImportResult(json as ImportResponse);
      setMessage({
        type: "success",
        text: `Importadas ${json.inserted} filas para ${season} (${gender === "male" ? "M" : "F"}).`,
      });
      refreshSeasons();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.main
      className="flex w-full max-w-4xl flex-col gap-5 py-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <button
        onClick={() => router.push("/stats")}
        className="flex w-fit items-center gap-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--accent)]"
      >
        <FontAwesomeIcon icon={faArrowLeft} /> Volver a estadísticas
      </button>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface)] p-5 sm:p-6"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-red-500/10 blur-3xl" />
        <PageHeader
          icon={faTableList}
          title="Importar clasificación de liga"
          subtitle="Sube el .xls/.xlsx final y asigna temporada y género"
        />
      </motion.div>

      <form
        onSubmit={handleSubmit}
        className="card-glass flex flex-col gap-4 p-5 sm:p-6"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-[var(--text-secondary)]">
              Temporada
            </label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="mt-1 rounded-xl border border-[color:var(--form-input-border)] bg-[var(--form-input-bg)] p-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              {seasonOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-[var(--text-secondary)]">
              Género
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as "male" | "female")}
              className="mt-1 rounded-xl border border-[color:var(--form-input-border)] bg-[var(--form-input-bg)] p-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-[var(--text-secondary)]">
            Archivo (.xls / .xlsx)
          </label>
          <input
            type="file"
            accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 rounded-xl border border-[color:var(--form-input-border)] bg-[var(--form-input-bg)] p-3 text-sm text-[var(--text-primary)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--accent)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary inline-flex items-center justify-center gap-2 self-end px-6 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Importando…
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faCloudArrowUp} /> Importar
            </>
          )}
        </button>

        {message && (
          <div
            className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${
              message.type === "success"
                ? "border-green-500/30 bg-green-600/15 text-green-300"
                : "border-red-500/30 bg-red-600/15 text-red-300"
            }`}
          >
            <FontAwesomeIcon
              icon={message.type === "success" ? faCircleCheck : faCircleExclamation}
            />
            <p className="font-medium">{message.text}</p>
          </div>
        )}
      </form>

      {importResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-glass p-5 sm:p-6"
        >
          <h3 className="section-header mb-3">Filas importadas ({importResult.inserted})</h3>
          {importResult.warnings.length > 0 && (
            <ul className="mb-3 list-disc rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 pl-7 text-xs text-amber-300">
              {importResult.warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-[var(--text-muted)]">
                  <th className="px-2 py-2">Pos</th>
                  <th className="px-2 py-2">Equipo</th>
                  <th className="px-2 py-2 text-right">Pts</th>
                </tr>
              </thead>
              <tbody>
                {importResult.rows.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-t border-[var(--glass-border)] ${
                      r.is_our_team ? "bg-[var(--accent-muted)]/40" : ""
                    }`}
                  >
                    <td className="px-2 py-1.5 tabular-nums">{r.position}</td>
                    <td className="px-2 py-1.5">{r.team_name}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {r.league_points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {importResult && (
        <AliasResolver
          unmatched={unmatched}
          candidates={candidates}
          onResolved={() => refreshUnmatched(season, gender)}
        />
      )}
    </motion.main>
  );
}
