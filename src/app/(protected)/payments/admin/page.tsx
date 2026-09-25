"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, FieldError } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useUser } from "@/contexts/UserContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCircleExclamation } from "@fortawesome/free-solid-svg-icons";
import {
  FormLayout,
  FormInput,
  FormSelect,
  FormDate,
  FormTextarea,
} from "@/components/ui/forms";
import { getCurrentSeason } from "@/utils/getCurrentSeason";

const paymentSchema = z.object({
  player_id: z.string().min(1, "El jugador es obligatorio"),
  concept: z.string().min(3, "El concepto debe tener al menos 3 caracteres"),
  amount: z.coerce.number().min(1, "El importe es obligatorio"),
  status: z.enum(["pending", "paid"], { message: "Selecciona un estado" }),
  due_date: z.string().min(1, "La fecha de vencimiento es obligatoria"),
  paid_date: z.string().optional(),
  notes: z.string().optional(),
  season: z.string().min(4),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { user } = useUser();
  const [players, setPlayers] = useState<
    { id: string; name: string; user_id: string | null }[]
  >([]);
  const [isPlayersLoading, setIsPlayersLoading] = useState(true);
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
      player_id: "ALL",
      concept: "Mensualidad",
      amount: 25,
      status: "pending" as "pending" | "paid",
      due_date: new Date().toISOString().split("T")[0],
      paid_date: "",
      notes: "",
      season: getCurrentSeason(),
    },
  });

  useEffect(() => {
    async function fetchSeniorPlayers() {
      try {
        const season = getCurrentSeason();
        const gender = user?.gender ? `&gender=${user.gender}` : "";
        const res = await fetch(`/api/payments?season=${encodeURIComponent(season)}${gender}`);
        if (!res.ok) throw new Error("Error cargando jugadores");
        const data = await res.json();
        setPlayers(
          (data.seniorPlayers ?? []).map(
            (p: { id: string; name: string; user_id?: string | null }) => ({
              id: p.id,
              name: p.name,
              user_id: p.user_id ?? null,
            })
          )
        );
      } catch (err) {
        console.error("No se pudo cargar el roster sénior:", err);
      } finally {
        setIsPlayersLoading(false);
      }
    }

    if (user?.isAdmin) {
      fetchSeniorPlayers();
    }
  }, [user]);

  if (!user?.isAdmin) {
    return (
      <main className="flex justify-center items-center min-h-screen text-red-600 font-semibold">
        Acceso denegado
      </main>
    );
  }

  const onSubmit = async (data: PaymentFormValues) => {
    setMessage(null);
    try {
      const payload = {
        ...data,
        ...(data.player_id === "ALL" && user.gender
          ? { gender: user.gender }
          : {}),
      };

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseJson = await res.json();

      if (!res.ok) throw new Error(responseJson.error || "Algo salió mal");

      setMessage({ type: "success", text: responseJson.message || "Guardado correctamente" });
      reset();
      setTimeout(() => router.push("/payments"), 2000);
    } catch (err: unknown) {
      setMessage({ type: "error", text: `Error: ${(err as Error).message}` });
    }
  };

  const playerOptions = [
    { value: "ALL", label: "A todos los sénior activos (masivo)" },
    ...players.map((p) => ({
      value: p.id,
      label: p.user_id
        ? p.name
        : `${p.name} · sin cuenta (no dado de alta)`,
    })),
  ];

  return (
    <main className="flex justify-center w-full px-2 py-4 md:px-4 md:py-10">
      <div className="w-full max-w-2xl">
        <button
          onClick={() => router.push("/payments")}
          className="mb-4 cursor-pointer text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition flex items-center gap-2 w-fit"
        >
          <FontAwesomeIcon icon={faArrowLeft} /> Volver a Pagos
        </button>

        <FormLayout
          title="Añadir o editar pago (admin)"
          description="Añade una cuota a un jugador de alta en equipo sénior (con o sin cuenta TM) o a todos los activos de la temporada."
          onSubmit={handleSubmit(onSubmit)}
          loading={isSubmitting}
          buttonText="Guardar Cuota / Asignar"
        >
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect
              label="Jugador *"
              name="player_id"
              control={control}
              options={isPlayersLoading ? [{ value: "", label: "Cargando..." }] : playerOptions}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Importe (€) *"
              name="amount"
              type="number"
              register={register("amount")}
              error={errors.amount as FieldError}
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
        </FormLayout>
      </div>
    </main>
  );
}
