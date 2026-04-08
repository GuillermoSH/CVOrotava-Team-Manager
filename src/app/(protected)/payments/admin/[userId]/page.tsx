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
  faPlus,
  faEdit,
  faCopy,
} from "@fortawesome/free-solid-svg-icons";
import PaymentModal, {
  type PaymentModalInitialData,
} from "@/components/payments/PaymentModal";

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
  season: string | null;
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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] =
    useState<PaymentModalInitialData | null>(null);
  
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
    if (!confirm("¿Estás seguro de que quieres eliminar este pago por completo? Esta acción no se puede deshacer.")) return;
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

  const openAddModal = () => {
    setModalInitialData(null);
    setIsModalOpen(true);
  };

  const openEditModal = (payment: Payment) => {
    setModalInitialData(payment);
    setIsModalOpen(true);
  };

  const duplicatePayment = (payment: Payment) => {
    // Se pasa como edición pero se marca que es duplicado
    setModalInitialData({ ...payment, status: "pending", paid_date: null, isDuplicate: true });
    setIsModalOpen(true);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No especificada";
    const [year, month, day] = dateString.split("T")[0].split("-");
    return `${day}/${month}/${year}`;
  };

  if (!user?.isAdmin) {
    return (
      <main className="flex justify-center items-center min-h-screen text-red-600 font-semibold">
        Acceso denegado
      </main>
    );
  }

  const totalPaid = payments.filter((p) => p.status === "paid").reduce((acc, p) => acc + Number(p.amount), 0);
  const totalPending = payments.filter((p) => p.status === "pending").reduce((acc, p) => acc + Number(p.amount), 0);

  return (
    <motion.main
      className="flex flex-col items-center w-full max-w-4xl py-4 pt-10 px-4 text-[var(--text-primary)] mx-auto"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      <div className="w-full flex justify-between items-center mb-6">
        <button 
          onClick={() => router.push('/payments')}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition flex items-center gap-2"
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
        <div className="card-glass p-5 flex flex-col justify-center border-l-4 border-l-[color:var(--payment-amount-paid)]">
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Total Pagado</p>
          <p className="text-4xl font-bold tabular-nums payment-amount--paid">{totalPaid}€</p>
        </div>
        
        <div className="card-glass p-5 flex flex-col justify-center border-l-4 border-l-red-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <FontAwesomeIcon icon={faCircleExclamation} className="text-6xl text-red-500" />
          </div>
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Deuda Pendiente</p>
          <p className="text-4xl font-bold tabular-nums payment-amount--pending">{totalPending}€</p>
        </div>
      </motion.div>

      {/* Payment records */}
      <motion.div variants={fadeUp} className="w-full flex flex-col sm:flex-row justify-between items-center mb-4 mt-6 gap-3">
         <h2 className="text-lg font-semibold border-b border-[var(--glass-border)] pb-2 w-full sm:w-auto flex-grow">Historial de Cuotas</h2>
         <button 
           onClick={openAddModal}
           className="btn-primary py-2 px-4 whitespace-nowrap self-stretch sm:self-auto flex items-center justify-center gap-2"
         >
           <FontAwesomeIcon icon={faPlus} /> Añadir Pago
         </button>
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
              className={`payment-card flex flex-col md:flex-row md:items-center justify-between rounded-xl p-5 backdrop-blur-sm transition-all duration-200 ${
                p.status === "paid" ? "payment-card--paid" : "payment-card--pending"
              }`}
            >
              <div className="flex flex-col gap-1 mb-4 md:mb-0 min-w-0">
                <div className="flex flex-wrap items-baseline gap-2 gap-y-1">
                  <span
                    className={`payment-badge shrink-0 ${
                      p.status === "paid" ? "payment-badge--paid" : "payment-badge--pending"
                    }`}
                  >
                    {p.status === "paid" ? "Pagado" : "Pendiente"}
                  </span>
                  <p className="min-w-0 text-lg font-bold leading-snug text-[var(--text-primary)]">
                    {p.concept}
                  </p>
                </div>

                <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                  <span>Fecha límite:</span>{" "}
                  <span className="font-mono text-[var(--text-secondary)]">{formatDate(p.due_date)}</span>
                  {p.season && (
                    <span className="ml-2 inline-flex items-center rounded-md border border-[color:var(--form-input-border)] bg-[var(--form-input-bg)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                      {p.season}
                    </span>
                  )}
                  {p.status === "paid" && p.paid_date && (
                    <span className="mt-1 block sm:mt-0 sm:ml-2 sm:inline">
                      <span>Pagado el:</span>{" "}
                      <span className="font-mono text-[var(--text-secondary)]">
                        {formatDate(p.paid_date)}
                      </span>
                    </span>
                  )}
                </p>
                {p.notes && <p className="text-xs text-[var(--text-muted)] italic mt-2 opacity-80">&quot;{p.notes}&quot;</p>}
              </div>
              
              <div className="flex items-center gap-6 self-start md:self-center">
                <span
                  className={`text-2xl font-bold tabular-nums ${
                    p.status === "paid" ? "payment-amount--paid" : "payment-amount--pending"
                  }`}
                >
                  {p.amount}€
                </span>

                <div className="flex items-stretch gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(p)}
                    className="payment-action-btn payment-action-btn--edit"
                    title="Editar cuota"
                  >
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicatePayment(p)}
                    className="payment-action-btn payment-action-btn--copy"
                    title="Duplicar cuota"
                  >
                    <FontAwesomeIcon icon={faCopy} />
                  </button>
                  {p.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => markAsPaid(p.id)}
                      className="payment-action-btn payment-action-btn--ok"
                      title="Marcar como pagado"
                    >
                      <FontAwesomeIcon icon={faCheck} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deletePayment(p.id)}
                    className="payment-action-btn payment-action-btn--delete"
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
      <PaymentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchPayments}
        initialData={modalInitialData}
        fixedUserId={targetUserId}
        users={payments.length > 0 ? [{ id: targetUserId, name: playerName }] : []} // No precisamos cargar los demás porque está fixed
      />
    </motion.main>
  );
}
