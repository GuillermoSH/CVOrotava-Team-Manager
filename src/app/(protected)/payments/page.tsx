"use client";

import { useState, useEffect } from "react";
import { motion, Variants } from "framer-motion";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMoneyBillWave,
  faCheckCircle,
  faCircleExclamation,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";

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
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

export default function PaymentsPage() {
  const { user } = useUser();
  const router = useRouter();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [adminOverview, setAdminOverview] = useState<AdminOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPayments() {
      try {
        const res = await fetch("/api/payments");
        if (!res.ok) throw new Error("Error cargando los pagos");
        
        const json = await res.json();
        const data = json.data as Payment[];

        if (json.isAdmin) {
          // Procesar para la tabla admin
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
              // Determinar gravedad de la deuda
              row.status = row.pendingAmount >= 100 ? "danger" : "warning";
            }
          });

          setAdminOverview(Array.from(playerMap.values()));
        } else {
          // Vista Jugador normal
          setPayments(data);
        }
      } catch (err: unknown) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchPayments();
    }
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
            onClick={() => window.location.href = '/payments/admin'}
          >
            Gestión de Pagos
          </button>
        )}
      </motion.div>

      {/* Loading / Error states */}
      {loading && (
        <div className="w-full flex justify-center py-10 text-[var(--text-muted)]">
          <p>Cargando información de pagos...</p>
        </div>
      )}

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
              <motion.div variants={fadeUp} className="card-glass p-5">
                <h2 className="section-header mb-4">
                  <FontAwesomeIcon icon={faUsers} className="text-[var(--text-secondary)] text-sm" />
                  Jugadores con actividad
                </h2>
                
                <div className="overflow-x-auto">
                  {adminOverview.length === 0 ? (
                    <div className="py-8 text-center text-[var(--text-muted)] text-sm bg-white/[0.02] rounded-lg border border-white/5">
                      No hay datos de pagos registrados en el club.
                    </div>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-[var(--text-muted)]">
                          <th className="pb-3 font-medium">Jugador</th>
                          <th className="pb-3 font-medium">Deuda acumulada</th>
                          <th className="pb-3 font-medium text-right">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {adminOverview.map((item) => (
                          <tr 
                            key={item.user_id} 
                            onClick={() => router.push(`/payments/admin/${item.user_id}`)}
                            className="group hover:bg-white/[0.04] transition-colors cursor-pointer border-b border-white/5 last:border-0"
                          >
                            <td className="py-4 px-2 font-medium text-white group-hover:text-[var(--accent-hover)] transition-colors">
                              {item.player}
                            </td>
                            <td className="py-4">
                              {item.pendingAmount > 0 ? (
                                <span className="text-red-400 font-semibold">{item.pendingAmount}€</span>
                              ) : (
                                <span className="text-green-400 font-medium">Al día</span>
                              )}
                            </td>
                            <td className="py-4 text-right">
                              {item.pendingAmount > 0 ? (
                                <span className={`badge ${item.status === 'danger' ? 'badge-danger' : 'badge-warning'}`}>
                                  {item.status === 'danger' ? 'Crítico' : 'Aviso'}
                                </span>
                              ) : (
                                <span className="badge badge-success">OK</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
    </motion.main>
  );
}
