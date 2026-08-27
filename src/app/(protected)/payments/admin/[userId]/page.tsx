"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { motion, useReducedMotion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faTrash,
  faCheck,
  faPlus,
  faEdit,
  faCopy,
} from "@fortawesome/free-solid-svg-icons";
import PaymentModal, {
  type PaymentModalInitialData,
} from "@/components/payments/PaymentModal";
import PageHeader from "@/components/ui/PageHeader";
import QuotaSeasonLayout from "@/components/payments/QuotaSeasonLayout";
import { isQuotaOverdue } from "@/components/payments/quotaDates";
import Tooltip, { TooltipGroup } from "@/components/ui/Tooltip";

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

const EASE = [0.16, 1, 0.3, 1] as const;

export default function AdminPlayerPaymentsDetail() {
  const { user } = useUser();
  const router = useRouter();
  const params = useParams();
  const targetUserId = params.userId as string;
  const reduceMotion = useReducedMotion();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] =
    useState<PaymentModalInitialData | null>(null);

  const playerName =
    payments.length > 0 && payments[0].users?.user_name
      ? payments[0].users.user_name
      : "Jugador";

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
      setPayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, status: "paid" } : p))
      );
    } catch (err: unknown) {
      alert("Error: " + (err as Error).message);
    }
  };

  const deletePayment = async (paymentId: string) => {
    if (
      !confirm(
        "¿Estás seguro de que quieres eliminar este pago por completo? Esta acción no se puede deshacer."
      )
    )
      return;
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "No se pudo eliminar");
      }
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
    setModalInitialData({
      ...payment,
      status: "pending",
      paid_date: null,
      isDuplicate: true,
    });
    setIsModalOpen(true);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No especificada";
    const [year, month, day] = dateString.split("T")[0].split("-");
    return `${day}/${month}/${year}`;
  };

  if (!user?.isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center font-semibold text-[var(--color-danger)]">
        Acceso denegado
      </main>
    );
  }

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((acc, p) => acc + Number(p.amount), 0);
  const totalPending = payments
    .filter((p) => p.status === "pending")
    .reduce((acc, p) => acc + Number(p.amount), 0);

  const sortedPayments = useMemo(() => {
    const byDue = (a: Payment, b: Payment) =>
      (a.due_date ?? "").localeCompare(b.due_date ?? "");
    return [
      ...payments.filter((p) => p.status === "pending").sort(byDue),
      ...payments.filter((p) => p.status === "paid").sort(byDue),
    ];
  }, [payments]);

  return (
    <motion.div
      className="flex w-full flex-col text-[var(--text-primary)]"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      <button
        type="button"
        onClick={() => router.push("/payments")}
        className="mb-6 inline-flex w-fit cursor-pointer items-center gap-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
        Volver a pagos
      </button>

      <PageHeader
        title={loading ? "Cuotas" : `Cuotas: ${playerName}`}
        actions={
          <button
            type="button"
            className="btn-primary flex items-center gap-2"
            onClick={openAddModal}
          >
            <FontAwesomeIcon icon={faPlus} /> Añadir pago
          </button>
        }
      />

      {!loading && !error && payments.length > 0 ? (
        <QuotaSeasonLayout
          pending={totalPending}
          paid={totalPaid}
          quotas={payments}
        >
          <ul className="divide-y divide-[var(--glass-border)] border-t border-[var(--glass-border)]">
            {sortedPayments.map((p) => {
              const overdue = isQuotaOverdue(p.status, p.due_date);
              return (
                <li
                  key={p.id}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`payment-badge ${
                        p.status === "paid"
                          ? "payment-badge--paid"
                          : overdue
                            ? "payment-badge--overdue"
                            : "payment-badge--pending"
                      }`}
                    >
                      {p.status === "paid"
                        ? "Pagado"
                        : overdue
                          ? "Atrasada"
                          : "Pendiente"}
                    </span>
                    <p className="text-base font-semibold text-[var(--text-primary)]">
                      {p.concept}
                    </p>
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    <span className="tabular-nums">{formatDate(p.due_date)}</span>
                    {p.season ? ` · ${p.season}` : ""}
                    {p.status === "paid" && p.paid_date
                      ? ` · pagado ${formatDate(p.paid_date)}`
                      : ""}
                  </p>
                  {p.notes && (
                    <p className="mt-1.5 text-xs italic text-[var(--text-muted)]">
                      &quot;{p.notes}&quot;
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-4 self-start md:self-center">
                  <span
                    className={`text-lg font-bold tabular-nums ${
                      p.status === "paid"
                        ? "payment-amount--paid"
                        : "payment-amount--pending"
                    }`}
                  >
                    {p.amount}€
                  </span>
                  <div className="flex items-stretch gap-1.5">
                    <TooltipGroup>
                      <Tooltip label="Editar cuota">
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="payment-action-btn"
                          aria-label="Editar cuota"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                      </Tooltip>
                      <Tooltip label="Duplicar cuota">
                        <button
                          type="button"
                          onClick={() => duplicatePayment(p)}
                          className="payment-action-btn"
                          aria-label="Duplicar cuota"
                        >
                          <FontAwesomeIcon icon={faCopy} />
                        </button>
                      </Tooltip>
                      {p.status === "pending" && (
                        <Tooltip label="Marcar como pagado">
                          <button
                            type="button"
                            onClick={() => markAsPaid(p.id)}
                            className="payment-action-btn"
                            aria-label="Marcar como pagado"
                          >
                            <FontAwesomeIcon icon={faCheck} />
                          </button>
                        </Tooltip>
                      )}
                      <Tooltip label="Eliminar cuota">
                        <button
                          type="button"
                          onClick={() => deletePayment(p.id)}
                          className="payment-action-btn payment-action-btn--delete"
                          aria-label="Eliminar cuota"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </Tooltip>
                    </TooltipGroup>
                  </div>
                </div>
              </li>
              );
            })}
          </ul>
        </QuotaSeasonLayout>
      ) : (
        <section>
          {loading ? (
            <p className="py-10 text-sm text-[var(--text-muted)]">Cargando…</p>
          ) : error ? (
            <p className="py-10 text-sm text-[var(--color-danger)]">{error}</p>
          ) : (
            <p className="py-10 text-sm text-[var(--text-muted)]">
              Este jugador no tiene pagos registrados.
            </p>
          )}
        </section>
      )}

      <PaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchPayments}
        initialData={modalInitialData}
        fixedUserId={targetUserId}
        users={
          payments.length > 0
            ? [{ id: targetUserId, name: playerName }]
            : []
        }
      />
    </motion.div>
  );
}
