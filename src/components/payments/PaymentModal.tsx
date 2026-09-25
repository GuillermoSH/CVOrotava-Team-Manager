"use client";

import { useEffect, useState } from "react";
import { useForm, FieldError } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faCircleExclamation } from "@fortawesome/free-solid-svg-icons";
import { getCurrentSeason, getSeasonSelectOptions } from "@/utils/getCurrentSeason";
import {
  FormInput,
  FormSelect,
  FormDate,
  FormTextarea,
} from "@/components/ui/forms";

const paymentSchema = z.object({
  player_id: z.string().min(1, "El jugador es obligatorio"),
  concept: z.string().min(3, "El concepto debe tener al menos 3 caracteres"),
  amount: z.coerce.number().min(1, "El importe es obligatorio"),
  status: z.enum(["pending", "paid"], { message: "Selecciona un estado" }),
  due_date: z.string().min(1, "La fecha de vencimiento es obligatoria"),
  paid_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  season: z.string().min(4, "Ejemplo: 2024/2025"),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;

export type PaymentModalInitialData = {
  id?: string;
  player_id?: string | null;
  /** Transition / display fallback. */
  user_id?: string | null;
  concept: string;
  amount: number;
  status: "pending" | "paid";
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  season: string | null;
  isDuplicate?: boolean;
};

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: PaymentModalInitialData | null;
  /** When set, player selector is locked to this roster player. */
  fixedPlayerId?: string;
  /** Roster senior players. `user_id` null ⇒ sin cuenta TM (se puede cobrar igual). */
  players: { id: string; name: string; user_id?: string | null }[];
  isPlayersLoading?: boolean;
  /** Optional gender filter applied on bulk ALL. */
  bulkGender?: string;
}

export default function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  fixedPlayerId,
  players,
  isPlayersLoading,
  bulkGender,
}: Readonly<PaymentModalProps>) {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      player_id: fixedPlayerId || "ALL",
      concept: "Mensualidad",
      amount: 25,
      status: "pending",
      due_date: new Date().toISOString().split("T")[0],
      paid_date: "",
      notes: "",
      season: getCurrentSeason(),
    },
  });

  useEffect(() => {
    if (isOpen) {
      setMessage(null);
      if (initialData) {
        reset({
          player_id:
            initialData.player_id ||
            fixedPlayerId ||
            initialData.user_id ||
            "",
          concept: initialData.concept,
          amount: initialData.amount,
          status: initialData.status,
          due_date: initialData.due_date ? initialData.due_date.split("T")[0] : "",
          paid_date: initialData.paid_date ? initialData.paid_date.split("T")[0] : "",
          notes: initialData.notes || "",
          season: initialData.season || getCurrentSeason(),
        });
      } else {
        reset({
          player_id: fixedPlayerId || "ALL",
          concept: "Mensualidad",
          amount: 25,
          status: "pending",
          due_date: new Date().toISOString().split("T")[0],
          paid_date: "",
          notes: "",
          season: getCurrentSeason(),
        });
      }
    }
  }, [isOpen, initialData, fixedPlayerId, reset]);

  const onSubmit = async (data: PaymentFormValues) => {
    setMessage(null);
    try {
      const url =
        initialData?.id && !initialData.isDuplicate
          ? `/api/payments/${initialData.id}`
          : `/api/payments`;

      const method =
        initialData?.id && !initialData.isDuplicate ? "PATCH" : "POST";

      const payload = {
        ...data,
        ...(data.player_id === "ALL" && bulkGender
          ? { gender: bulkGender }
          : {}),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseJson = await res.json();

      if (!res.ok) throw new Error(responseJson.error || "Algo salió mal");

      setMessage({
        type: "success",
        text: responseJson.message || "Pago guardado con éxito",
      });

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: unknown) {
      setMessage({ type: "error", text: `Error: ${(err as Error).message}` });
    }
  };

  const playerOptions = fixedPlayerId
    ? players
        .filter((p) => p.id === fixedPlayerId)
        .map((p) => ({
          value: p.id,
          label: p.user_id
            ? p.name
            : `${p.name} · sin cuenta (no dado de alta)`,
        }))
    : [
        { value: "ALL", label: "A todos los sénior activos (masivo)" },
        ...players.map((p) => ({
          value: p.id,
          label: p.user_id
            ? p.name
            : `${p.name} · sin cuenta (no dado de alta)`,
        })),
      ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl bg-[var(--color-bg-elevated)] border border-[var(--glass-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex justify-between items-center p-4 border-b border-[var(--glass-border)] bg-[var(--glass-surface)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {initialData && !initialData.isDuplicate ? "Editar pago" : "Añadir pago"}
            </h2>
            <button
              onClick={onClose}
              className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)] transition w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--glass-surface-hover)]"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
            {message && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`mb-4 flex w-full items-center gap-3 rounded-lg border p-3 ${
                  message.type === "success"
                    ? "border-[var(--color-success-border)] bg-[var(--color-success-muted)] text-[var(--color-success)]"
                    : "border-[color-mix(in_srgb,var(--color-danger)_35%,transparent)] bg-[var(--color-danger-muted)] text-[var(--color-danger)]"
                }`}
              >
                <FontAwesomeIcon icon={faCircleExclamation} />
                <p className="text-sm font-medium">{message.text}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormSelect
                  label="Jugador *"
                  name="player_id"
                  control={control}
                  options={
                    isPlayersLoading
                      ? [{ value: "", label: "Cargando..." }]
                      : playerOptions
                  }
                  error={errors.player_id as FieldError}
                />

                <FormInput
                  label="Concepto *"
                  name="concept"
                  register={register("concept")}
                  placeholder="Ej: Cuota Marzo, Equipación..."
                  error={errors.concept as FieldError}
                />
              </div>
              {!fixedPlayerId && !isPlayersLoading && players.length === 0 ? (
                <p className="-mt-2 text-xs text-[var(--text-muted)]">
                  No hay jugadores de alta en equipo sénior para esta
                  temporada/género. Créalos o asígnalos en el Portal.
                </p>
              ) : !fixedPlayerId &&
                !isPlayersLoading &&
                players.some((p) => !p.user_id) ? (
                <p className="-mt-2 text-xs text-[var(--text-muted)]">
                  Los marcados «sin cuenta» están en el roster sénior pero aún no
                  tienen usuario de Team Manager enlazado. Se les puede asignar
                  la cuota igual.
                </p>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormInput
                  label="Importe (€) *"
                  name="amount"
                  type="number"
                  register={register("amount")}
                  error={errors.amount as FieldError}
                />

                <FormSelect
                  label="Temporada *"
                  name="season"
                  control={control}
                  options={getSeasonSelectOptions()}
                  error={errors.season as FieldError}
                />

                <FormSelect
                  label="Estado *"
                  name="status"
                  control={control}
                  options={[
                    { value: "pending", label: "Pendiente" },
                    { value: "paid", label: "Pagado" },
                  ]}
                  error={errors.status as FieldError}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormDate
                  label="Fecha límite *"
                  name="due_date"
                  register={register("due_date")}
                  error={errors.due_date as FieldError}
                />
                <FormDate
                  label="Fecha pagado (Opcional)"
                  name="paid_date"
                  register={register("paid_date")}
                  error={errors.paid_date as FieldError}
                />
              </div>

              <FormTextarea
                label="Notas"
                name="notes"
                register={register("notes")}
                placeholder="Comentarios adicionales sobre el pago..."
                error={errors.notes as FieldError}
              />

              <div className="pt-4 mt-2 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="cursor-pointer px-5 py-2.5 text-sm font-semibold rounded-xl border border-[color:var(--form-input-border)] text-[var(--text-primary)] hover:bg-[var(--surface-faint)] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary px-5 py-2.5 text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting ? "Guardando..." : "Guardar Pago"}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
