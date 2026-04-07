"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, Variants } from "framer-motion";
import Loading from "@/components/common/Loading";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMoneyBillWave,
  faCheckCircle,
  faCircleExclamation,
  faUsers,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import PaymentModal from "@/components/payments/PaymentModal";
import FilterBar, { FilterConfig } from "@/components/ui/FilterBar";
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
  created_at: string;
  updated_at: string;
  users?: { user_name: string }; // Desde el join en la vista admin
}

// ── Admin UI Aggregation Type ──
interface AdminOverviewRow {
  user_id: string;
  player: string;
  pendingAmount: number;
  status: "success" | "warning" | "danger";
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

type AdminSortKey = "name_asc" | "name_desc" | "debt_desc" | "debt_asc" | "status";

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

export default function PaymentsPage() {
  const { user } = useUser();
  const router = useRouter();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [adminOverview, setAdminOverview] = useState<AdminOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { seasons } = useSeasons();

  // Filtros
  const [filters, setFilters] = useState<Record<string, string | undefined>>({
    season: getCurrentSeason(),
    gender: user?.gender ?? undefined,
  });

  // Users for modal
  const [allUsers, setAllUsers] = useState<{ id: string; name: string }[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Sync user gender once it loads if not an admin (admins can see all or explicitly filter)
  useEffect(() => {
    if (user && !user.isAdmin && user.gender && !filters.gender) {
      setFilters((prev) => ({ ...prev, gender: user.gender as string }));
    }
  }, [user, filters.gender]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [adminSort, setAdminSort] = useState<AdminSortKey>("name_asc");

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (user?.isAdmin) {
        if (filters.season) params.append("season", filters.season);
        if (filters.gender) params.append("gender", filters.gender);
      } else {
        if (filters.season) params.append("season", filters.season);
      }

      const res = await fetch(`/api/payments?${params.toString()}`);
      if (!res.ok) throw new Error("Error cargando los pagos");
      
      const json = await res.json();
      const data = json.data as Payment[];

      if (json.isAdmin) {
        const playerMap = new Map<string, AdminOverviewRow>();
        data.forEach((p) => {
          if (!playerMap.has(p.user_id)) {
            playerMap.set(p.user_id, {
              user_id: p.user_id,
              player: p.users?.user_name || "Desconocido",
              pendingAmount: 0,
              status: "success",
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
    if (user) {
      fetchPayments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filters]);

  // Fetch all users for the Modal
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

  // Metrics calculation (Player Only)
  const totalPaid = payments.filter((p) => p.status === "paid").reduce((acc, p) => acc + Number(p.amount), 0);
  const totalPending = payments.filter((p) => p.status === "pending").reduce((acc, p) => acc + Number(p.amount), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="badge badge-success">
            <FontAwesomeIcon icon={faCheckCircle} /> Pagado
          </span>
        );
      case "pending":
        return (
          <span className="badge badge-danger">
            <FontAwesomeIcon icon={faCircleExclamation} /> Pendiente
          </span>
        );
      default:
        return null;
    }
  };

  // Formateador de fechas
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No especificada";
    const [year, month, day] = dateString.split("T")[0].split("-");
    return `${day}/${month}/${year}`;
  };

  const sortedAdminOverview = useMemo(() => {
    const rows = [...adminOverview];
    const byName = (a: AdminOverviewRow, b: AdminOverviewRow) =>
      a.player.localeCompare(b.player, "es", { sensitivity: "base" });

    switch (adminSort) {
      case "name_asc":
        return rows.sort(byName);
      case "name_desc":
        return rows.sort((a, b) => -byName(a, b));
      case "debt_desc":
        return rows.sort((a, b) => b.pendingAmount - a.pendingAmount || byName(a, b));
      case "debt_asc":
        return rows.sort((a, b) => a.pendingAmount - b.pendingAmount || byName(a, b));
      case "status":
        return rows.sort(
          (a, b) => statusRank(b.status) - statusRank(a.status) || byName(a, b)
        );
      default:
        return rows;
    }
  }, [adminOverview, adminSort]);

  const filterConfigs: FilterConfig[] = [
    {
      key: "season",
      label: "Temporada",
      options: seasons.map((s) => ({ label: s, value: s })),
    },
    ...(user?.isAdmin ? [{
      key: "gender",
      label: "Género",
      options: [
        { label: "Masculino", value: "male" },
        { label: "Femenino", value: "female" },
      ],
    }] : []),
  ];

  return (
    <motion.main
      className="flex flex-col items-center w-full max-w-6xl py-4 text-white"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="w-full mb-6 flex flex-wrap gap-4 items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">
            <FontAwesomeIcon icon={faMoneyBillWave} className="mr-2 text-[var(--accent)]" />
            Control de Pagos
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {user?.isAdmin ? "Vista global de cuotas del club (Admin)" : "Estado de tus cuotas y pagos"}
          </p>
        </div>
        {user?.isAdmin && (
          <button 
            type="button" 
            className="btn-primary flex items-center gap-2"
            onClick={() => setIsModalOpen(true)}
          >
            <FontAwesomeIcon icon={faPlus} /> Añadir Pago
          </button>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp} className="w-full">
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          configs={filterConfigs}
        />
      </motion.div>

      {/* Loading / Error states */}
      {loading && <Loading />}

      {error && !loading && (
        <div className="w-full p-4 mb-4 bg-red-900/20 border border-red-500/30 rounded-xl">
          <p className="text-sm font-semibold text-red-200">Error</p>
          <p className="text-xs text-red-300 mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {user?.isAdmin ? (
            /* ── ADMIN VIEW ── */
            <motion.div variants={stagger} className="w-full space-y-4">
              <motion.div variants={fadeUp} className="card-glass p-5 sm:p-6">
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <h2 className="section-header mb-0">
                    <FontAwesomeIcon icon={faUsers} className="text-[var(--text-secondary)] text-sm" />
                    Jugadores con actividad
                  </h2>
                  {adminOverview.length > 0 && (
                    <label className="flex w-full flex-col gap-1.5 text-xs sm:max-w-xs sm:items-end">
                      <span className="font-medium uppercase tracking-wide text-[var(--text-muted)]">
                        Ordenar por
                      </span>
                      <select
                        value={adminSort}
                        onChange={(e) => setAdminSort(e.target.value as AdminSortKey)}
                        className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm font-medium text-white shadow-inner outline-none transition hover:border-white/15 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25 sm:w-auto sm:min-w-[14rem]"
                      >
                        <option value="name_asc">Nombre (A → Z)</option>
                        <option value="name_desc">Nombre (Z → A)</option>
                        <option value="debt_desc">Deuda (mayor primero)</option>
                        <option value="debt_asc">Deuda (menor primero)</option>
                        <option value="status">Estado (crítico primero)</option>
                      </select>
                    </label>
                  )}
                </div>

                <div className="overflow-x-auto">
                  {adminOverview.length === 0 ? (
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] py-10 text-center text-sm text-[var(--text-muted)]">
                      No hay datos de pagos registrados en el club.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-[var(--text-muted)]">
                        {sortedAdminOverview.length}{" "}
                        {sortedAdminOverview.length === 1 ? "jugador" : "jugadores"} · pulsa una fila para el detalle
                      </p>

                      <ul className="mt-1 flex flex-col gap-2">
                        {sortedAdminOverview.map((item) => {
                          const avatarTone =
                            item.status === "danger"
                              ? "border-red-500/35 bg-red-500/10 text-red-100"
                              : item.status === "warning"
                                ? "border-amber-500/35 bg-amber-500/10 text-amber-100"
                                : "border-emerald-500/35 bg-emerald-500/10 text-emerald-100";

                          return (
                            <li key={item.user_id}>
                              <button
                                type="button"
                                onClick={() => router.push(`/payments/admin/${item.user_id}`)}
                                className="group flex w-full flex-col gap-3 rounded-xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-4 text-left shadow-sm transition-all duration-200 hover:border-white/15 hover:from-white/[0.06] hover:to-white/[0.03] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 sm:flex-row sm:items-center sm:gap-4 sm:p-4"
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                  <div
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${avatarTone}`}
                                  >
                                    {playerInitials(item.player)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-white group-hover:text-white">
                                      {item.player}
                                    </p>
                                    <p className="mt-0.5 text-xs text-[var(--text-muted)] sm:hidden">
                                      {item.pendingAmount > 0 ? "Pendiente de cuota" : "Sin cuotas pendientes"}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex flex-1 items-center justify-between gap-6 border-t border-white/[0.06] pt-3 sm:flex-initial sm:gap-8 sm:border-0 sm:pt-0">
                                  <div className="min-w-[5rem] text-left sm:w-28 sm:flex sm:justify-center">
                                    {item.pendingAmount > 0 ? (
                                      <span className="text-lg font-bold tabular-nums text-red-400">
                                        {item.pendingAmount}€
                                      </span>
                                    ) : (
                                      <span className="text-sm font-semibold text-green-400">Al día</span>
                                    )}
                                  </div>
                                  <div className="flex shrink-0 justify-end pr-1 sm:min-w-[6.5rem] sm:justify-center sm:pr-0">
                                    {item.pendingAmount > 0 ? (
                                      <span
                                        className={`badge ${item.status === "danger" ? "badge-danger" : "badge-warning"}`}
                                      >
                                        {item.status === "danger" ? "Crítico" : "Aviso"}
                                      </span>
                                    ) : (
                                      <span className="badge badge-success">OK</span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          ) : (
            /* ── PLAYER VIEW ── */
            <motion.div variants={stagger} className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Metrics summary */}
              <motion.div variants={fadeUp} className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="card-glass p-5 flex flex-col justify-center">
                  <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Total Pagado</p>
                  <p className="text-3xl font-bold text-green-400 tabular-nums">{totalPaid}€</p>
                </div>
                
                <div className="card-glass p-5 flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <FontAwesomeIcon icon={faCircleExclamation} className="text-6xl text-red-500" />
                  </div>
                  <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Pendiente</p>
                  <p className="text-3xl font-bold text-red-400 tabular-nums">{totalPending}€</p>
                </div>
              </motion.div>

              {/* Payments list */}
              <motion.div variants={fadeUp} className="card-glass p-5 md:col-span-3">
                <h2 className="section-header mb-4">Desglose de cuotas</h2>
                
                {payments.length === 0 ? (
                  <div className="py-10 flex flex-col items-center justify-center text-center bg-white/[0.02] rounded-xl border border-white/5">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-4xl text-green-500/50 mb-3" />
                    <p className="font-semibold text-white">¡Estás al día!</p>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      Actualmente no tienes ningún pago o cuota asignada a tu perfil.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {payments.map((payment) => (
                      <div 
                        key={payment.id} 
                        className={`flex items-center justify-between p-4 rounded-xl border backdrop-blur-sm transition-all duration-200 hover:bg-white/[0.04] ${
                          payment.status === 'paid' ? 'bg-green-500/5 border-green-500/10' :
                          'bg-red-500/5 border-red-500/20'
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          <p className="font-semibold text-white">{payment.concept}</p>
                          <p className="text-xs text-[var(--text-muted)]">Fecha de cobro: <span className="text-white/80">{formatDate(payment.due_date)}</span></p>
                          {payment.notes && (
                            <p className="text-xs text-[var(--text-muted)] italic mt-1">&quot;{payment.notes}&quot;</p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-right">
                          <span className="text-lg font-bold tabular-nums">
                            {payment.amount}€
                          </span>
                          <div className="w-32 flex justify-end">
                            {getStatusBadge(payment.status)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </>
      )}

      {/* Admin Add Payment Modal */}
      {user?.isAdmin && (
        <PaymentModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchPayments}
          users={allUsers}
          isUsersLoading={usersLoading}
        />
      )}
    </motion.main>
  );
}
