"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { motion, Variants } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCircleExclamation,
  faTrash,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";

// Reutilizamos la interfaz
interface Payment {
  id: string;
  user_id: string;
  concept: string;
  amount: number;
  status: "pending" | "paid";
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  users?: { user_name: string };
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

export default function AdminPlayerPaymentsDetail() {
  const { user } = useUser();
  const router = useRouter();
  const params = useParams();
  const targetUserId = params.userId as string;

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Nombresito para enseñar
  const playerName = payments.length > 0 && payments[0].users?.user_name ? payments[0].users.user_name : "Jugador";

  useEffect(() => {
    fetchPayments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, targetUserId]);

  async function fetchPayments() {
    if (!user?.isAdmin) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/payments?userId=${targetUserId}`);
      if (!res.ok) throw new Error("Error cargando cuotas del jugador");
      const json = await res.json();
      setPayments(json.data || []);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const markAsPaid = async (paymentId: string) => {
    if (!confirm("¿Marcar esta cuota como pagada?")) return;
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "No se pudo actualizar");
      }
      // Actualizar estado local
      setPayments((prev) => 
        prev.map((p) => (p.id === paymentId ? { ...p, status: "paid" } : p))
      );
    } catch (err: unknown) {
      alert("Error: " + (err as Error).message);
    }
  };

  const deletePayment = async (paymentId: string) => {
    if (!confirm("⚠️ ¿Estás seguro de que quieres eliminar este pago por completo? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "No se pudo eliminar");
      }
      // Filtramos de la vista
      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    } catch (err: unknown) {
      alert("Error: " + (err as Error).message);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No especificada";
    const [year, month, day] = dateString.split("T")[0].split("-");
    return `${day}/${month}/${year}`;
  };

  if (!user?.isAdmin) {
    return (
      <main className="flex justify-center items-center min-h-screen text-red-600 font-semibold">
        Acceso denegado ❌
      </main>
    );
  }

  const totalPaid = payments.filter((p) => p.status === "paid").reduce((acc, p) => acc + Number(p.amount), 0);
  const totalPending = payments.filter((p) => p.status === "pending").reduce((acc, p) => acc + Number(p.amount), 0);

  return (
    <motion.main
      className="flex flex-col items-center w-full max-w-4xl py-4 pt-10 px-4 text-white mx-auto"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      <div className="w-full flex justify-between items-center mb-6">
        <button 
          onClick={() => router.push('/payments')}
          className="text-sm text-[var(--text-secondary)] hover:text-white transition flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faArrowLeft} /> Volver a Panel
        </button>
      </div>

      <motion.div variants={fadeUp} className="w-full mb-8">
        <h1 className="text-3xl font-bold">Cuotas: <span className="text-[var(--accent)]">{loading ? "..." : playerName}</span></h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Gestión detallada de pagos para este jugador concreto.</p>
      </motion.div>

      {/* Metrics summary */}
      <motion.div variants={fadeUp} className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="card-glass p-5 flex flex-col justify-center border-l-4 border-l-green-500">
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Total Pagado</p>
          <p className="text-4xl font-bold text-white tabular-nums">{totalPaid}€</p>
        </div>
        
        <div className="card-glass p-5 flex flex-col justify-center border-l-4 border-l-red-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <FontAwesomeIcon icon={faCircleExclamation} className="text-6xl text-red-500" />
          </div>
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Deuda Pendiente</p>
          <p className="text-4xl font-bold text-white tabular-nums">{totalPending}€</p>
        </div>
      </motion.div>

      {/* Payment records */}
      <motion.div variants={fadeUp} className="w-full flex justify-between items-center mb-4 mt-6">
         <h2 className="text-lg font-semibold border-b border-white/20 pb-2 flex-grow">Historial de Cuotas</h2>
      </motion.div>

      <div className="w-full flex flex-col gap-3">
        {loading ? (
          <p className="text-center py-10 text-[var(--text-muted)]">Cargando...</p>
        ) : error ? (
          <p className="text-center py-10 text-red-400">{error}</p>
        ) : payments.length === 0 ? (
          <div className="py-10 text-center card-glass">
            <p className="text-[var(--text-muted)]">Este jugador no tiene pagos registrados.</p>
          </div>
        ) : (
          payments.map((p) => (
            <motion.div 
              variants={fadeUp}
              key={p.id}
              className={`flex flex-col md:flex-row md:items-center justify-between p-5 rounded-xl border backdrop-blur-sm transition-all duration-200 ${
                p.status === 'paid' ? 'bg-green-500/5 border-green-500/10' : 'bg-red-500/5 border-red-500/20'
              }`}
            >
              <div className="flex flex-col gap-1 mb-4 md:mb-0">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-[2px] rounded text-xs font-bold uppercase tracking-wider ${
                    p.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {p.status === 'paid' ? 'Pagado' : 'Pendiente'}
                  </span>
                  <p className="font-semibold text-lg text-white">{p.concept}</p>
                </div>
                
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Fecha límite: <span className="text-white/80 font-mono">{formatDate(p.due_date)}</span>
                  {p.status === 'paid' && p.paid_date && (
                    <span className="ml-3 text-green-300/70">Pagado el: <span className="font-mono">{formatDate(p.paid_date)}</span></span>
                  )}
                </p>
                {p.notes && <p className="text-xs text-[var(--text-muted)] italic mt-2 opacity-80">&quot;{p.notes}&quot;</p>}
              </div>
              
              <div className="flex items-center gap-6 self-start md:self-center">
                <span className={`text-2xl font-bold tabular-nums ${p.status === 'paid' ? 'text-green-400' : 'text-red-400'}`}>
                  {p.amount}€
                </span>

                <div className="flex items-stretch gap-2">
                  {p.status === 'pending' && (
                    <button
                      onClick={() => markAsPaid(p.id)}
                      className="px-3 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                      title="Marcar como pagado"
                    >
                      <FontAwesomeIcon icon={faCheck} /> Pagado
                    </button>
                  )}
                  <button
                    onClick={() => deletePayment(p.id)}
                    className="px-3 py-2 bg-red-500/5 hover:bg-red-500/15 text-red-400/70 hover:text-red-400 border border-transparent hover:border-red-500/20 rounded-lg transition-all text-sm flex items-center gap-2"
                    title="Eliminar cuota"
                  >
                    <FontAwesomeIcon icon={faTrash} /> 
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.main>
  );
}
