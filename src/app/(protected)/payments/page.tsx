"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Loading from "@/components/common/Loading";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faArrowDownAZ,
  faArrowUpZA,
  faArrowDownWideShort,
  faArrowUpWideShort,
} from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import PaymentModal from "@/components/payments/PaymentModal";
import QuotaSeasonLayout from "@/components/payments/QuotaSeasonLayout";
import FilterBar, { FilterConfig } from "@/components/ui/FilterBar";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { useSeasons } from "@/contexts/SeasonContext";
import { getCurrentSeason } from "@/utils/getCurrentSeason";

type PaymentStatus = "pending" | "paid";

export interface Payment {
  id: string;
  user_id: string;
  concept: string;
  amount: number;
  status: PaymentStatus;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  season: string | null;
  created_at: string;
  updated_at: string;
  users?: { user_name: string };
}

interface AdminOverviewRow {
  user_id: string;
  player: string;
  pendingAmount: number;
  status: "success" | "warning" | "danger";
  lastSignInAt: string | null;
}

const EASE = [0.16, 1, 0.3, 1] as const;

type AdminSortField = "name" | "debt" | "status";
type AdminSortDir = "asc" | "desc";

function defaultSortDir(field: AdminSortField): AdminSortDir {
  return field === "name" ? "asc" : "desc";
}

function sortDirLabel(field: AdminSortField, dir: AdminSortDir): string {
  if (field === "name") return dir === "asc" ? "A → Z" : "Z → A";
  if (field === "debt") {
    return dir === "desc" ? "Mayor primero" : "Menor primero";
  }
  return dir === "desc" ? "Crítico primero" : "Al día primero";
}

function sortDirIcon(field: AdminSortField, dir: AdminSortDir) {
  if (field === "name") return dir === "asc" ? faArrowDownAZ : faArrowUpZA;
  return dir === "desc" ? faArrowDownWideShort : faArrowUpWideShort;
}

function playerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

function statusRank(s: AdminOverviewRow["status"]): number {
  if (s === "danger") return 2;
  if (s === "warning") return 1;
  return 0;
}

function formatLastSignInLabel(iso: string | null | undefined): string {
  if (!iso) return "Sin último acceso";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Sin último acceso";
  const date = d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `Últ. acceso ${date}`;
}

export default function PaymentsPage() {
  const { user } = useUser();
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [adminOverview, setAdminOverview] = useState<AdminOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { seasons } = useSeasons();

  const [filters, setFilters] = useState<Record<string, string | undefined>>({
    season: getCurrentSeason(),
    gender: user?.gender ?? undefined,
  });

  const [allUsers, setAllUsers] = useState<{ id: string; name: string }[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adminSortField, setAdminSortField] =
    useState<AdminSortField>("name");
  const [adminSortDir, setAdminSortDir] = useState<AdminSortDir>("asc");

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (user?.isAdmin) {
        if (filters.season) params.append("season", filters.season);
        if (filters.gender) params.append("gender", filters.gender);
      } else if (filters.season) {
        params.append("season", filters.season);
      }

      const res = await fetch(`/api/payments?${params.toString()}`);
      if (!res.ok) throw new Error("Error cargando los pagos");

      const json = await res.json();
      const data = json.data as Payment[];
      const authLastSignInAtByUserId = (json.authLastSignInAtByUserId ??
        {}) as Record<string, string | null>;

      if (json.isAdmin) {
        const playerMap = new Map<string, AdminOverviewRow>();
        data.forEach((p) => {
          if (!playerMap.has(p.user_id)) {
            playerMap.set(p.user_id, {
              user_id: p.user_id,
              player: p.users?.user_name || "Desconocido",
              pendingAmount: 0,
              status: "success",
              lastSignInAt: authLastSignInAtByUserId[p.user_id] ?? null,
            });
          }
          if (p.status === "pending") {
            const row = playerMap.get(p.user_id)!;
            row.pendingAmount += Number(p.amount);
            row.status = row.pendingAmount >= 100 ? "danger" : "warning";
          }
        });
        setAdminOverview(Array.from(playerMap.values()));
      } else {
        setPayments(data);
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filters]);

  useEffect(() => {
    async function fetchAllUsers() {
      if (!user?.isAdmin) return;
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          setAllUsers(
            data.map((u: { id: string; user_name?: string | null }) => ({
              id: u.id,
              name: u.user_name || "Desconocido",
            }))
          );
        }
      } catch (err) {
        console.error("Error al cargar usuarios", err);
      } finally {
        setUsersLoading(false);
      }
    }
    fetchAllUsers();
  }, [user]);

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((acc, p) => acc + Number(p.amount), 0);
  const totalPending = payments
    .filter((p) => p.status === "pending")
    .reduce((acc, p) => acc + Number(p.amount), 0);

  const sortedAdminOverview = useMemo(() => {
    const rows = [...adminOverview];
    const byName = (a: AdminOverviewRow, b: AdminOverviewRow) =>
      a.player.localeCompare(b.player, "es", { sensitivity: "base" });
    const dir = adminSortDir === "asc" ? 1 : -1;

    switch (adminSortField) {
      case "name":
        return rows.sort((a, b) => dir * byName(a, b));
      case "debt":
        return rows.sort(
          (a, b) => dir * (a.pendingAmount - b.pendingAmount) || byName(a, b)
        );
      case "status":
        return rows.sort(
          (a, b) => dir * (statusRank(a.status) - statusRank(b.status)) || byName(a, b)
        );
      default:
        return rows;
    }
  }, [adminOverview, adminSortField, adminSortDir]);

  const filterConfigs: FilterConfig[] = [
    {
      key: "season",
      label: "Temporada",
      options: seasons.map((s) => ({ label: s, value: s })),
    },
    ...(user?.isAdmin
      ? [
          {
            key: "gender",
            label: "Género",
            options: [
              { label: "Masculino", value: "male" },
              { label: "Femenino", value: "female" },
            ],
          },
        ]
      : []),
  ];

  return (
    <motion.div
      className="flex w-full flex-col text-[var(--text-primary)]"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      <PageHeader
        title="Control de pagos"
        subtitle={
          user?.isAdmin
            ? "Vista global de cuotas del club"
            : user?.isActive === false
              ? "Cuenta inactiva · puedes consultar lo que debes"
              : undefined
        }
        actions={
          user?.isAdmin ? (
            <button
              type="button"
              className="btn-primary flex items-center gap-2"
              onClick={() => setIsModalOpen(true)}
            >
              <FontAwesomeIcon icon={faPlus} /> Añadir pago
            </button>
          ) : null
        }
      />

      {user && user.isActive === false && !user.isAdmin ? (
        <p
          role="status"
          className="mb-4 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-faint)] px-3 py-2.5 text-sm text-[var(--text-secondary)]"
        >
          Tu cuenta está marcada como inactiva (fuera del equipo activo). Puedes
          seguir viendo tus cuotas; si vuelves al club, un admin te reactivará.
        </p>
      ) : null}

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        configs={filterConfigs}
      />

      {loading && <Loading />}

      {error && !loading && (
        <div className="mb-4 rounded-xl border border-[color-mix(in_srgb,var(--color-danger)_35%,transparent)] bg-[var(--color-danger-muted)] p-4">
          <p className="text-sm font-semibold text-[var(--color-danger)]">
            Error
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {user?.isAdmin ? (
            <section>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                    Jugadores
                  </h2>
                  {adminOverview.length > 0 && (
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {sortedAdminOverview.length}{" "}
                      {sortedAdminOverview.length === 1
                        ? "jugador"
                        : "jugadores"}{" "}
                      · pulsa una fila para el detalle
                    </p>
                  )}
                </div>
                {adminOverview.length > 0 && (
                  <div className="flex w-full flex-col gap-2 sm:max-w-none sm:flex-row sm:items-center sm:justify-end">
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                      Ordenar
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <SegmentedControl
                        aria-label="Criterio de orden"
                        value={adminSortField}
                        onChange={(field) => {
                          if (field === adminSortField) {
                            setAdminSortDir((d) =>
                              d === "asc" ? "desc" : "asc"
                            );
                            return;
                          }
                          setAdminSortField(field);
                          setAdminSortDir(defaultSortDir(field));
                        }}
                        options={[
                          { value: "name", label: "Nombre" },
                          { value: "debt", label: "Deuda" },
                          { value: "status", label: "Estado" },
                        ]}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setAdminSortDir((d) => (d === "asc" ? "desc" : "asc"))
                        }
                        aria-label={`Invertir orden: ${sortDirLabel(adminSortField, adminSortDir)}`}
                        className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--glass-border)] bg-[var(--surface-faint)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-surface)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
                      >
                        <FontAwesomeIcon
                          icon={sortDirIcon(adminSortField, adminSortDir)}
                        />
                        {sortDirLabel(adminSortField, adminSortDir)}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {adminOverview.length === 0 ? (
                <p className="py-10 text-sm text-[var(--text-muted)]">
                  No hay datos de pagos registrados en el club.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--glass-border)] border-t border-[var(--glass-border)]">
                  {sortedAdminOverview.map((item) => {
                    const avatarTone =
                      item.status === "danger"
                        ? "player-avatar-tint--danger"
                        : item.status === "warning"
                          ? "player-avatar-tint--warning"
                          : "player-avatar-tint--success";

                    return (
                      <li key={item.user_id}>
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/payments/admin/${item.user_id}`)
                          }
                          className="group flex w-full cursor-pointer flex-col gap-3 py-4 text-left transition-colors hover:bg-[var(--surface-faint)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] sm:flex-row sm:items-center sm:gap-4"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${avatarTone}`}
                            >
                              {playerInitials(item.player)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">
                                {item.player}
                              </p>
                              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                                {formatLastSignInLabel(item.lastSignInAt)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-4 sm:justify-end sm:gap-6">
                            {item.pendingAmount > 0 ? (
                              <span className="text-lg font-bold tabular-nums text-[var(--accent)]">
                                {item.pendingAmount}€
                              </span>
                            ) : (
                              <span className="payment-label-ok text-sm font-semibold">
                                Al día
                              </span>
                            )}
                            {item.pendingAmount > 0 ? (
                              <span
                                className={`badge ${
                                  item.status === "danger"
                                    ? "badge-danger"
                                    : "badge-warning"
                                }`}
                              >
                                {item.status === "danger" ? "Crítico" : "Aviso"}
                              </span>
                            ) : (
                              <span className="badge badge-success">OK</span>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : (
            payments.length === 0 ? (
              <div className="py-6">
                <p className="font-semibold text-[var(--text-primary)]">
                  No tienes cuotas en esta temporada
                </p>
              </div>
            ) : (
              <QuotaSeasonLayout
                pending={totalPending}
                paid={totalPaid}
                quotas={payments}
              />
            )
          )}
        </>
      )}

      {user?.isAdmin && (
        <PaymentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchPayments}
          users={allUsers}
          isUsersLoading={usersLoading}
        />
      )}
    </motion.div>
  );
}
