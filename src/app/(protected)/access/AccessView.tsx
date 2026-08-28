"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTrash,
  faPenToSquare,
  faCheck,
  faXmark,
  faMagnifyingGlass,
  faUserCheck,
  faUserClock,
  faPowerOff,
} from "@fortawesome/free-solid-svg-icons";
import { useUser } from "@/contexts/UserContext";
import PageHeader from "@/components/ui/PageHeader";
import { AccessListSkeleton } from "@/components/skeletons/AccessSkeleton";
import FilterBar, { type FilterConfig } from "@/components/ui/FilterBar";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Pagination from "@/components/ui/Pagination";
import { readPref, writePref } from "@/lib/prefs";
import { sileo } from "sileo";
import {
  isInactiveAccess,
  isRegisteredAccess,
  type AllowedEmailRow,
} from "@/lib/auth/allowedEmails";
import {
  ACCESS_GROUP_OPTIONS,
  formatAdded,
  formatLastSignIn,
  genderLabel,
  groupAccessRows,
  roleLabel,
  type AccessGroupBy,
} from "@/lib/access/groupAccess";

const EASE = [0.16, 1, 0.3, 1] as const;
const PAGE_SIZE = 8;
const GROUP_PREF_KEY = "cvorotava-access-group";

type GenderValue = "male" | "female";

function isAccessGroupBy(value: string | null): value is AccessGroupBy {
  return (
    value === "status" ||
    value === "activity" ||
    value === "role" ||
    value === "gender" ||
    value === "none"
  );
}

function ActionBtn({
  label,
  onClick,
  disabled,
  danger,
  type = "button",
  icon,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  type?: "button" | "submit";
  icon: typeof faCheck;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 cursor-pointer touch-manipulation items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 ${
        danger
          ? "border-[color-mix(in_srgb,var(--color-danger)_35%,var(--glass-border))] text-[var(--color-danger)] hover:bg-[var(--color-danger-muted)]"
          : "border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-[var(--glass-surface)] hover:text-[var(--text-primary)]"
      }`}
    >
      <FontAwesomeIcon icon={icon} className="text-[0.7rem]" />
      <span>{label}</span>
    </button>
  );
}

export default function AccessView({
  initialRows = [],
}: {
  initialRows?: AllowedEmailRow[];
}) {
  const { user } = useUser();
  const reduceMotion = useReducedMotion();

  const [rows, setRows] = useState<AllowedEmailRow[]>(initialRows);
  const [loading, setLoading] = useState(initialRows.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editGender, setEditGender] = useState<GenderValue>("male");
  const [filters, setFilters] = useState<Record<string, string | undefined>>(
    {}
  );
  const [groupBy, setGroupByState] = useState<AccessGroupBy>("status");
  const [pageByGroup, setPageByGroup] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/allowed-emails");
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "No se pudieron cargar los usuarios");
      setRows(json.data ?? []);
      setError(null);
    } catch (err: unknown) {
      const message = (err as Error).message;
      setError(message);
      sileo.error({
        title: "Error al cargar usuarios",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialRows.length > 0) return;
    if (user?.isAdmin) load();
  }, [user, load, initialRows.length]);

  useEffect(() => {
    const stored = readPref(GROUP_PREF_KEY);
    if (isAccessGroupBy(stored)) setGroupByState(stored);
  }, []);

  const setGroupBy = (next: AccessGroupBy) => {
    setGroupByState(next);
    writePref(GROUP_PREF_KEY, next);
    setPageByGroup({});
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (q) {
        const hay = `${r.email} ${r.user_name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.status === "registered" && !isRegisteredAccess(r))
        return false;
      if (filters.status === "pending" && isRegisteredAccess(r)) return false;
      if (filters.activity === "active") {
        if (!isRegisteredAccess(r) || r.is_active === false) return false;
      }
      if (filters.activity === "inactive" && !isInactiveAccess(r)) return false;
      if (filters.role && r.role !== filters.role) return false;
      if (filters.gender && r.gender !== filters.gender) return false;
      return true;
    });
  }, [rows, query, filters]);

  const groups = useMemo(
    () => groupAccessRows(filtered, groupBy),
    [filtered, groupBy]
  );

  useEffect(() => {
    setPageByGroup((prev) => {
      const next = { ...prev };
      for (const g of groups) {
        const count = Math.max(1, Math.ceil(g.rows.length / PAGE_SIZE));
        if ((next[g.key] ?? 1) > count) next[g.key] = count;
      }
      return next;
    });
  }, [groups]);

  const filterConfigs: FilterConfig[] = [
    {
      key: "status",
      label: "Cuenta",
      options: [
        { label: "Con cuenta", value: "registered" },
        { label: "Pendientes", value: "pending" },
      ],
    },
    {
      key: "activity",
      label: "Actividad",
      options: [
        { label: "Activos", value: "active" },
        { label: "Inactivos", value: "inactive" },
      ],
    },
    {
      key: "role",
      label: "Rol",
      options: [
        { label: "Admin", value: "admin" },
        { label: "Entrenador", value: "coach" },
        { label: "Jugador", value: "player" },
      ],
    },
    {
      key: "gender",
      label: "Género",
      options: [
        { label: "Masculino", value: "male" },
        { label: "Femenino", value: "female" },
      ],
    },
  ];

  if (!user?.isAdmin) {
    return (
      <main className="flex min-h-[40vh] items-center justify-center font-semibold text-[var(--color-danger)]">
        Acceso denegado
      </main>
    );
  }

  const startEdit = (row: AllowedEmailRow) => {
    setEditing(row.email);
    setEditValue(row.email);
    setEditGender(row.gender === "female" ? "female" : "male");
  };

  const toggleActive = async (row: AllowedEmailRow) => {
    if (!row.user_id || row.role === "admin" || row.email === user?.email) {
      return;
    }
    const nextActive = row.is_active === false;
    setTogglingId(row.user_id);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.user_id, is_active: nextActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo actualizar");
      setRows((prev) =>
        prev.map((r) =>
          r.user_id === row.user_id ? { ...r, is_active: nextActive } : r
        )
      );
      const name = row.user_name?.trim() || row.email;
      sileo.success({
        title: nextActive ? "Reactivado" : "Marcado inactivo",
        description: name,
      });
    } catch (err: unknown) {
      sileo.error({
        title: "No se pudo cambiar la actividad",
        description: (err as Error).message,
      });
    } finally {
      setTogglingId(null);
    }
  };

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
      sileo.success({
        title: "Usuario añadido",
        description: `${json.email ?? email} ya puede entrar con Google`,
      });
      await load();
    } catch (err: unknown) {
      sileo.error({
        title: "No se pudo añadir",
        description: (err as Error).message,
      });
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (row: AllowedEmailRow) => {
    const nextEmail = editValue.trim();
    if (!nextEmail || saving) return;
    const isSelf = row.email === user.email;
    const registered = isRegisteredAccess(row);

    setSaving(true);
    setError(null);
    try {
      const messages: string[] = [];

      if (!isSelf && nextEmail !== row.email) {
        const res = await fetch("/api/allowed-emails", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: row.email, nextEmail }),
        });
        const json = await res.json();
        if (!res.ok)
          throw new Error(json.error || "No se pudo guardar el email");
        messages.push(`Email → ${json.email ?? nextEmail}`);
      }

      if (registered && row.user_id && row.gender !== editGender) {
        const res = await fetch("/api/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: row.user_id, gender: editGender }),
        });
        const json = await res.json();
        if (!res.ok)
          throw new Error(json.error || "No se pudo guardar el género");
        messages.push(
          `Género → ${editGender === "male" ? "Masculino" : "Femenino"}`
        );
      }

      setEditing(null);
      if (messages.length > 0) {
        sileo.success({
          title: "Guardado",
          description: messages.join(" · "),
        });
      } else {
        sileo.info({ title: "Sin cambios" });
      }
      await load();
    } catch (err: unknown) {
      sileo.error({
        title: "No se pudo guardar",
        description: (err as Error).message,
      });
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
      sileo.success({
        title: "Acceso quitado",
        description: email,
      });
      await load();
    } catch (err: unknown) {
      sileo.error({
        title: "No se pudo quitar",
        description: (err as Error).message,
      });
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const myEmail = user.email;
  const registeredCount = rows.filter(isRegisteredAccess).length;
  const pendingCount = rows.length - registeredCount;
  const inactiveCount = rows.filter(isInactiveAccess).length;

  return (
    <motion.div
      className="flex w-full flex-col text-[var(--text-primary)]"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      <PageHeader
        title="Usuarios"
        subtitle={
          loading
            ? "Quién puede entrar con Google y datos de perfil"
            : `${rows.length} en la lista · ${registeredCount} con cuenta · ${inactiveCount} inactivos · ${pendingCount} pendientes`
        }
      />

      <section className="mb-6 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface)] p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Añadir usuario
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Autoriza el email de Google. Hasta que inicie sesión aparece en
          Pendientes; el género se puede editar cuando ya tenga cuenta.
        </p>
        <form
          onSubmit={addEmail}
          className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <label className="sr-only" htmlFor="access-new-email">
            Email de Google
          </label>
          <input
            id="access-new-email"
            type="email"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="nina.v@example.com"
            autoComplete="off"
            required
            className="min-h-10 w-full flex-1 rounded-xl border border-[color:var(--form-input-border)] bg-[var(--form-input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[color:var(--form-placeholder)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-muted)]"
          />
          <button
            type="submit"
            disabled={saving || !draft.trim()}
            className="btn-primary w-full touch-manipulation disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <FontAwesomeIcon icon={faPlus} />
            {saving ? "Añadiendo…" : "Añadir"}
          </button>
        </form>
      </section>

      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-[color-mix(in_srgb,var(--color-danger)_35%,var(--glass-border))] bg-[var(--color-danger-muted)] px-3 py-2 text-sm text-[var(--color-danger)]"
        >
          {error}
        </p>
      ) : null}

      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-8">
          <label className="relative block w-full shrink-0 md:max-w-xs">
            <span className="sr-only">Buscar usuarios</span>
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPageByGroup({});
              }}
              placeholder="Buscar email o nombre…"
              className="w-full rounded-xl border border-[var(--form-input-border)] bg-[var(--form-input-bg)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--form-placeholder)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-muted)]"
            />
          </label>

          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-end lg:gap-3">
            <SegmentedControl
              label="Agrupar"
              aria-label="Agrupar usuarios"
              value={groupBy}
              onChange={setGroupBy}
              className="md:hidden lg:flex"
              options={ACCESS_GROUP_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
            />

            <FilterBar
              className="mb-0 md:justify-end"
              filters={filters}
              setFilters={(next) => {
                setFilters(next);
                setPageByGroup({});
              }}
              configs={filterConfigs}
            />
          </div>
        </div>

        <SegmentedControl
          label="Agrupar"
          aria-label="Agrupar usuarios"
          value={groupBy}
          onChange={setGroupBy}
          className="hidden justify-end md:flex lg:hidden"
          options={ACCESS_GROUP_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
        />
      </div>

      {loading ? (
        <AccessListSkeleton />
      ) : filtered.length === 0 ? (
        <div className="flex min-h-[28vh] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--glass-border)] bg-[var(--surface-faint)] px-6 py-12 text-center">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {query || Object.values(filters).some(Boolean)
              ? "Ningún usuario coincide"
              : "Aún no hay usuarios en la lista"}
          </p>
          <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)]">
            {query || Object.values(filters).some(Boolean)
              ? "Prueba a limpiar la búsqueda o los filtros."
              : "Usa «Añadir usuario» para autorizar la primera cuenta de Google."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) => {
            const page = pageByGroup[group.key] ?? 1;
            const pageCount = Math.max(
              1,
              Math.ceil(group.rows.length / PAGE_SIZE)
            );
            const slice = group.rows.slice(
              (page - 1) * PAGE_SIZE,
              page * PAGE_SIZE
            );
            const showHeader = groupBy !== "none" || groups.length > 1;

            return (
              <section key={group.key} className="min-w-0">
                <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                      {showHeader ? group.label : "Usuarios"}
                      <span className="ml-2 text-base font-normal tabular-nums text-[var(--text-muted)]">
                        {group.rows.length}
                      </span>
                    </h2>
                    {showHeader && group.hint ? (
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {group.hint}
                      </p>
                    ) : null}
                  </div>
                  <Pagination
                    page={page}
                    pageCount={pageCount}
                    label={group.label}
                    onChange={(p) =>
                      setPageByGroup((prev) => ({
                        ...prev,
                        [group.key]: p,
                      }))
                    }
                  />
                </header>

                <ul className="divide-y divide-[var(--glass-border)]">
                  {slice.map((row) => {
                    const isSelf = row.email === myEmail;
                    const registered = isRegisteredAccess(row);
                    const inactive = isInactiveAccess(row);
                    const role = roleLabel(row.role);
                    const gender = genderLabel(row.gender);
                    const added = formatAdded(row.created_at);
                    const last = formatLastSignIn(row.last_sign_in_at);
                    const isEditing = editing === row.email;
                    const displayName = row.user_name?.trim() || row.email;

                    return (
                      <li
                        key={row.email}
                        className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                      >
                        {isEditing ? (
                          <form
                            className="flex min-w-0 flex-1 flex-col gap-3"
                            onSubmit={(e) => {
                              e.preventDefault();
                              void saveEdit(row);
                            }}
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                              <div className="min-w-0 flex-1 sm:max-w-md">
                                <label
                                  htmlFor={`edit-email-${row.email}`}
                                  className="mb-1 block text-[11px] font-medium text-[var(--text-muted)]"
                                >
                                  Email
                                </label>
                                <input
                                  id={`edit-email-${row.email}`}
                                  type="email"
                                  value={editValue}
                                  onChange={(e) =>
                                    setEditValue(e.target.value)
                                  }
                                  autoFocus={!isSelf}
                                  disabled={isSelf}
                                  className="min-h-10 w-full rounded-xl border border-[color:var(--form-input-border)] bg-[var(--form-input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-muted)] disabled:cursor-not-allowed disabled:opacity-60"
                                />
                              </div>
                              {registered ? (
                                <div className="sm:w-44">
                                  <label
                                    htmlFor={`edit-gender-${row.email}`}
                                    className="mb-1 block text-[11px] font-medium text-[var(--text-muted)]"
                                  >
                                    Género
                                  </label>
                                  <select
                                    id={`edit-gender-${row.email}`}
                                    value={editGender}
                                    onChange={(e) =>
                                      setEditGender(
                                        e.target.value as GenderValue
                                      )
                                    }
                                    className="min-h-10 w-full cursor-pointer rounded-xl border border-[color:var(--form-input-border)] bg-[var(--form-input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-muted)]"
                                  >
                                    <option value="male">Masculino</option>
                                    <option value="female">Femenino</option>
                                  </select>
                                </div>
                              ) : (
                                <p className="self-end pb-2 text-xs text-[var(--text-muted)] sm:max-w-[14rem]">
                                  El género se podrá editar cuando entre por
                                  primera vez.
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <ActionBtn
                                type="submit"
                                label="Guardar"
                                icon={faCheck}
                                disabled={saving}
                              />
                              <ActionBtn
                                label="Cancelar"
                                icon={faXmark}
                                onClick={() => setEditing(null)}
                              />
                            </div>
                          </form>
                        ) : (
                          <>
                            <div className="flex min-w-0 flex-1 gap-3">
                              <span
                                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs ${
                                  registered
                                    ? "border-[color-mix(in_srgb,var(--accent)_30%,var(--glass-border))] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)]"
                                    : "border-[var(--glass-border)] bg-[var(--surface-faint)] text-[var(--text-muted)]"
                                }`}
                                aria-hidden
                              >
                                <FontAwesomeIcon
                                  icon={registered ? faUserCheck : faUserClock}
                                />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-[var(--text-primary)]">
                                  {displayName}
                                  {isSelf ? (
                                    <span className="ml-2 text-xs font-medium text-[var(--text-muted)]">
                                      Tú
                                    </span>
                                  ) : null}
                                </p>
                                {row.user_name ? (
                                  <p className="truncate text-xs text-[var(--text-muted)]">
                                    {row.email}
                                  </p>
                                ) : null}
                                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-muted)]">
                                  <span
                                    className={`rounded-md px-1.5 py-0.5 font-medium ${
                                      registered
                                        ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]"
                                        : "bg-[var(--surface-faint)] text-[var(--text-secondary)]"
                                    }`}
                                  >
                                    {registered ? "Con cuenta" : "Pendiente"}
                                  </span>
                                  {registered ? (
                                    <span
                                      className={`rounded-md px-1.5 py-0.5 font-medium ${
                                        inactive
                                          ? "bg-[var(--color-danger-muted)] text-[var(--color-danger)]"
                                          : "bg-[var(--color-success-muted)] text-[var(--color-success)]"
                                      }`}
                                    >
                                      {inactive ? "Inactivo" : "Activo"}
                                    </span>
                                  ) : null}
                                  {role ? <span>{role}</span> : null}
                                  {gender ? <span>{gender}</span> : null}
                                  {registered ? (
                                    <time
                                      dateTime={
                                        row.last_sign_in_at ?? undefined
                                      }
                                      title={last.title}
                                    >
                                      Último acceso · {last.label}
                                    </time>
                                  ) : added ? (
                                    <span>Añadido · {added}</span>
                                  ) : null}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                              {registered &&
                              row.role !== "admin" &&
                              !isSelf &&
                              row.user_id ? (
                                <button
                                  type="button"
                                  aria-pressed={!inactive}
                                  aria-label={
                                    inactive
                                      ? `Reactivar a ${displayName}`
                                      : `Desactivar a ${displayName}`
                                  }
                                  title={inactive ? "Reactivar" : "Desactivar"}
                                  disabled={togglingId === row.user_id}
                                  onClick={() => void toggleActive(row)}
                                  className={`inline-flex h-9 w-9 cursor-pointer touch-manipulation items-center justify-center rounded-lg border transition-colors disabled:cursor-wait disabled:opacity-50 ${
                                    inactive
                                      ? "border-[color-mix(in_srgb,var(--color-danger)_35%,var(--glass-border))] text-[var(--color-danger)] hover:bg-[var(--color-danger-muted)]"
                                      : "border-[var(--glass-border)] text-[var(--color-success)] hover:bg-[var(--color-success-muted)]"
                                  }`}
                                >
                                  <FontAwesomeIcon
                                    icon={faPowerOff}
                                    className="text-[0.75rem]"
                                  />
                                </button>
                              ) : null}
                              <ActionBtn
                                label="Editar"
                                icon={faPenToSquare}
                                onClick={() => startEdit(row)}
                              />
                              {!isSelf ? (
                                <ActionBtn
                                  label="Quitar"
                                  icon={faTrash}
                                  danger
                                  disabled={saving}
                                  onClick={() => void removeEmail(row.email)}
                                />
                              ) : null}
                            </div>                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
