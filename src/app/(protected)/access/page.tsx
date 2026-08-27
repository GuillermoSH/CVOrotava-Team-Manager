"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTrash,
  faEdit,
  faCheck,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useUser } from "@/contexts/UserContext";
import PageHeader from "@/components/ui/PageHeader";
import Loading from "@/components/common/Loading";
import Tooltip, { TooltipGroup } from "@/components/ui/Tooltip";
import type { AllowedEmailRow } from "@/lib/auth/allowedEmails";

const EASE = [0.16, 1, 0.3, 1] as const;

function roleLabel(role: AllowedEmailRow["role"]): string | null {
  if (role === "admin") return "Admin";
  if (role === "coach") return "Entrenador";
  if (role === "player") return "Jugador";
  return null;
}

function formatAdded(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AccessPage() {
  const { user } = useUser();
  const reduceMotion = useReducedMotion();

  const [rows, setRows] = useState<AllowedEmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/allowed-emails");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudieron cargar los accesos");
      setRows(json.data ?? []);
      setError(null);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.isAdmin) load();
  }, [user, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.email.includes(q) ||
        (r.user_name ?? "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  if (!user?.isAdmin) {
    return (
      <main className="flex min-h-[40vh] items-center justify-center font-semibold text-[var(--color-danger)]">
        Acceso denegado
      </main>
    );
  }

  const addEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = draft.trim();
    if (!email || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/allowed-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo añadir");
      setDraft("");
      await load();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (email: string) => {
    const nextEmail = editValue.trim();
    if (!nextEmail || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/allowed-emails", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, nextEmail }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo guardar");
      setEditing(null);
      await load();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const removeEmail = async (email: string) => {
    if (!confirm(`¿Quitar el acceso de ${email}?`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/allowed-emails", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo quitar");
      await load();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const myEmail = user.email;

  return (
    <motion.div
      className="flex w-full flex-col text-[var(--text-primary)]"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      <PageHeader
        title="Accesos"
        subtitle="Emails que pueden entrar con Google"
      />

      <form
        onSubmit={addEmail}
        className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <input
          type="email"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="nina.v@example.com"
          autoComplete="off"
          className="min-h-10 w-full rounded-xl border border-[color:var(--form-input-border)] bg-[var(--form-input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[color:var(--form-placeholder)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] sm:max-w-md"
        />
        <button
          type="submit"
          disabled={saving || !draft.trim()}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faPlus} />
          Añadir
        </button>
      </form>

      {rows.length > 8 ? (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar email o nombre"
          className="mb-4 min-h-10 w-full max-w-md rounded-xl border border-[color:var(--form-input-border)] bg-[var(--form-input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[color:var(--form-placeholder)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      ) : null}

      {error ? (
        <p className="mb-4 text-sm text-[var(--color-danger)]">{error}</p>
      ) : null}

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <p className="py-10 text-sm text-[var(--text-muted)]">
          {query ? "Ningún acceso coincide con la búsqueda." : "No hay emails en la lista."}
        </p>
      ) : (
        <section>
          <p className="mb-2 text-sm text-[var(--text-muted)]">
            {filtered.length} {filtered.length === 1 ? "acceso" : "accesos"}
            {query ? ` de ${rows.length}` : ""}
          </p>
          <ul className="divide-y divide-[var(--glass-border)] border-t border-[var(--glass-border)]">
            {filtered.map((row) => {
              const isSelf = row.email === myEmail;
              const role = roleLabel(row.role);
              const added = formatAdded(row.created_at);
              const isEditing = editing === row.email;

              return (
                <li
                  key={row.email}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  {isEditing ? (
                    <form
                      className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void saveEdit(row.email);
                      }}
                    >
                      <input
                        type="email"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                        className="min-h-10 w-full rounded-xl border border-[color:var(--form-input-border)] bg-[var(--form-input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] sm:max-w-md"
                      />
                      <TooltipGroup>
                        <Tooltip label="Guardar">
                          <button
                            type="submit"
                            disabled={saving}
                            className="payment-action-btn"
                            aria-label="Guardar"
                          >
                            <FontAwesomeIcon icon={faCheck} />
                          </button>
                        </Tooltip>
                        <Tooltip label="Cancelar">
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="payment-action-btn"
                            aria-label="Cancelar"
                          >
                            <FontAwesomeIcon icon={faXmark} />
                          </button>
                        </Tooltip>
                      </TooltipGroup>
                    </form>
                  ) : (
                    <>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[var(--text-primary)]">
                          {row.email}
                          {isSelf ? (
                            <span className="ml-2 text-xs font-medium text-[var(--text-muted)]">
                              Tú
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                          {row.user_name ?? "Aún no ha entrado"}
                          {role ? ` · ${role}` : ""}
                          {added ? ` · ${added}` : ""}
                        </p>
                      </div>
                      {!isSelf ? (
                        <TooltipGroup>
                          <Tooltip label="Editar email">
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(row.email);
                                setEditValue(row.email);
                              }}
                              className="payment-action-btn"
                              aria-label="Editar email"
                            >
                              <FontAwesomeIcon icon={faEdit} />
                            </button>
                          </Tooltip>
                          <Tooltip label="Quitar acceso">
                            <button
                              type="button"
                              onClick={() => void removeEmail(row.email)}
                              disabled={saving}
                              className="payment-action-btn payment-action-btn--delete"
                              aria-label="Quitar acceso"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </Tooltip>
                        </TooltipGroup>
                      ) : null}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </motion.div>
  );
}
