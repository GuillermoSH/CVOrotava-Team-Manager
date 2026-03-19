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

// Schema validación
const paymentSchema = z.object({
  user_id: z.string().min(1, "El jugador es obligatorio"),
  concept: z.string().min(3, "El concepto debe tener al menos 3 caracteres"),
  amount: z.coerce.number().min(1, "El importe es obligatorio"),
  status: z.enum(["pending", "paid"], { message: "Selecciona un estado" }),
  due_date: z.string().min(1, "La fecha de vencimiento es obligatoria"),
  paid_date: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { user } = useUser();
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      user_id: "ALL", // Empieza preseleccionado en Todos por comodidad
      concept: "Mensualidad",
      amount: 25,
      status: "pending" as "pending" | "paid",
      due_date: new Date().toISOString().split("T")[0],
      paid_date: "",
      notes: "",
    },
  });

  // Fetch lista de usuarios para el selector
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) throw new Error("Error cargando jugadores");
        const data = await res.json();
        setUsers(data.map((u: { id: string; user_name: string }) => ({ id: u.id, name: u.user_name || "Desconocido" })));
      } catch (err) {
        console.error("No se pudo cargar la lista de todos los jugadores:", err);
      } finally {
        setIsUsersLoading(false);
      }
    }
    
    if (user?.isAdmin) {
      fetchUsers();
    }
  }, [user]);

  if (!user?.isAdmin) {
    return (
      <main className="flex justify-center items-center min-h-screen text-red-600 font-semibold">
        Acceso denegado ❌
      </main>
    );
  }

  // Enviar Petición
  const onSubmit = async (data: PaymentFormValues) => {
    setMessage(null);
    try {
      const payload = {
        ...data,
      };

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const responseJson = await res.json();

      if (!res.ok) throw new Error(responseJson.error || "Algo salió mal");

      setMessage({ type: "success", text: `✅ ${responseJson.message}` });
      reset();
      // Volver a la tabla admin después de un tiempo
      setTimeout(() => router.push("/payments"), 2000);
      
    } catch (err: unknown) {
      setMessage({ type: "error", text: `❌ Error: ${(err as Error).message}` });
    }
  };

  const userOptions = [
    { value: "ALL", label: "🌍 A todos los jugadores (Masivo)" },
    ...users.map((u) => ({ value: u.id, label: u.name })),
  ];

  return (
    <main className="flex justify-center w-full px-2 py-4 md:px-4 md:py-10">
      <div className="w-full max-w-2xl">
        <button 
          onClick={() => router.push('/payments')}
          className="mb-4 text-sm text-[var(--text-secondary)] hover:text-white transition flex items-center gap-2 w-fit"
        >
          <FontAwesomeIcon icon={faArrowLeft} /> Volver a Pagos
        </button>

        <FormLayout
          title="💳 Añadir/Editar Pago (Admin)"
          description="Añade una nueva cuota a un jugador o a todo el club a la vez."
          onSubmit={handleSubmit(onSubmit)}
          loading={isSubmitting}
          buttonText="Guardar Cuota / Asignar"
        >
          {message && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`w-full mb-4 p-3 rounded-lg flex items-center gap-3 border ${
                message.type === "success" 
                  ? "bg-green-600/20 text-green-300 border-green-500/20" 
                  : "bg-red-600/20 text-red-300 border-red-500/20"
              }`}
            >
              <FontAwesomeIcon icon={faCircleExclamation} />
              <p className="text-sm font-medium">{message.text}</p>
            </motion.div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Jugador */}
            <FormSelect
              label="Jugador *"
              name="user_id"
              register={register("user_id")}
              options={isUsersLoading ? [{ value: "", label: "Cargando..." }] : userOptions}
              error={errors.user_id as FieldError}
            />

            {/* Concepto */}
            <FormInput
              label="Concepto *"
              name="concept"
              register={register("concept")}
              placeholder="Ej: Cuota Marzo, Equipación..."
              error={errors.concept as FieldError}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Importe */}
            <FormInput
              label="Importe (€) *"
              name="amount"
              type="number"
              register={register("amount")}
              error={errors.amount as FieldError}
            />
            
            {/* Estado */}
            <FormSelect
              label="Estado *"
              name="status"
              register={register("status")}
              options={[
                { value: "pending", label: "Pendiente" },
                { value: "paid", label: "Pagado" },
              ]}
              error={errors.status as FieldError}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Fecha Vencimiento */}
            <FormDate
              label="Fecha límite *"
              name="due_date"
              register={register("due_date")}
              error={errors.due_date as FieldError}
            />
            {/* Fecha Cobro */}
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
