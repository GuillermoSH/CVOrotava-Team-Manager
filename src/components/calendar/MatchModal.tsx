import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faSpinner, faTrash, faPlus, faMinus } from "@fortawesome/free-solid-svg-icons";
import { FormInput, FormDate, FormTime, FormSelect } from "@/components/ui/forms";
import { getCurrentSeason } from "@/utils/getCurrentSeason";
import { useUser } from "@/contexts/UserContext";

const matchSchema = z.object({
  id: z.string().optional(),
  date: z.string().min(1, "La fecha es obligatoria"),
  time: z.string().min(1, "La hora es obligatoria"),
  opponent: z.string().min(2, "El rival es obligatorio"),
  season: z.string().min(4, "Ej: 2024/2025"),
  venue_id: z.string().uuid("Selecciona un pabellón válido").min(1, "Selecciona un pabellón"),
  video_url: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  result: z.string().optional().or(z.literal("")),
  gender: z.enum(["male", "female"], { message: "El género es obligatorio" }),
  match_sets: z
    .array(
      z.object({
        team_score: z.number().int().min(0),
        opponent_score: z.number().int().min(0),
      })
    )
    .max(5)
    .optional(),
});

export type MatchFormValues = z.infer<typeof matchSchema>;

type VenueOption = {
  id: string;
  venue_name: string;
  location_type: string;
};

type MatchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: MatchFormValues;
};

export default function MatchModal({ isOpen, onClose, onSuccess, initialData }: Readonly<MatchModalProps>) {
  const { user } = useUser();
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { register, control, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<MatchFormValues>({
    resolver: zodResolver(matchSchema),
    defaultValues: initialData || {
      date: "",
      time: "",
      opponent: "",
      season: getCurrentSeason(),
      gender: user?.gender ?? "male",
      venue_id: "",
      video_url: "",
      notes: "",
      result: "",
      match_sets: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "match_sets",
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({ ...initialData, match_sets: initialData.match_sets || [] });
      } else {
        reset({
          date: "",
          time: "",
          opponent: "",
          season: getCurrentSeason(),
          gender: user?.gender ?? "male",
          venue_id: venues[0]?.id || "",
          video_url: "",
          notes: "",
          result: "",
          match_sets: [],
        });
      }
      setMessage(null);
      setIsDeleting(false);
    }
  }, [isOpen, initialData, reset, user, venues]);

  useEffect(() => {
    async function fetchVenues() {
      if (!isOpen) return;
      try {
        const res = await fetch("/api/venues");
        if (res.ok) {
          const data = await res.json();
          setVenues(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingVenues(false);
      }
    }
    fetchVenues();
  }, [isOpen]);

  const onSubmit = async (data: MatchFormValues) => {
    setMessage(null);
    
    let computedResult = null;
    if (data.match_sets && data.match_sets.length > 0) {
      let team = 0;
      let opp = 0;
      data.match_sets.forEach((setObj) => {
        if (setObj.team_score > setObj.opponent_score) team++;
        else if (setObj.opponent_score > setObj.team_score) opp++;
      });
      computedResult = `${team}-${opp}`;
    }

    const payload = {
      ...data,
      result:
        data.match_sets && data.match_sets.length > 0
          ? computedResult
          : data.result?.trim() || null,
    };

    try {
      const isEdit = !!initialData?.id;
      const url = isEdit ? `/api/matches/${initialData.id}` : "/api/matches";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const apiError = await res.json();
        throw new Error(apiError.error || "Error al procesar el partido");
      }

      setMessage({ type: "success", text: isEdit ? "Partido actualizado con éxito" : "Partido creado con éxito" });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 800);
    } catch (err: unknown) {
      setMessage({ type: "error", text: (err as Error).message });
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    if (!confirm("¿Estás seguro de que deseas eliminar este partido? Esta acción no se puede deshacer.")) return;
    
    setIsDeleting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/matches/${initialData.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al eliminar");
      }
      setMessage({ type: "success", text: "Partido eliminado correctamente" });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 800);
    } catch (err: unknown) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setIsDeleting(false);
    }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2 } },
  };

  const uniqueVenues = Array.from(new Map(venues.map((v) => [v.venue_name, v])).values());
  const groupedVenues = uniqueVenues.reduce(
    (acc, v) => {
      if (v.location_type === "home") acc.home.push(v);
      else if (v.location_type === "away") acc.away.push(v);
      else if (v.location_type === "outside_island") acc.trip.push(v);
      return acc;
    },
    { home: [], away: [], trip: [] } as Record<"home" | "away" | "trip", VenueOption[]>
  );

  const venueOptions = [
    ...(groupedVenues.home.length > 0 ? [{ label: "🏠 Casa", options: groupedVenues.home.map((v) => ({ value: v.id, label: v.venue_name })) }] : []),
    ...(groupedVenues.away.length > 0 ? [{ label: "🚗 Fuera (misma isla)", options: groupedVenues.away.map((v) => ({ value: v.id, label: v.venue_name })) }] : []),
    ...(groupedVenues.trip.length > 0 ? [{ label: "✈️ Viaje (fuera isla)", options: groupedVenues.trip.map((v) => ({ value: v.id, label: v.venue_name })) }] : []),
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-2xl bg-[#121214] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="text-xl font-bold text-white">
                {initialData ? "✏️ Editar Partido" : "🏐 Añadir Partido"}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-[var(--text-muted)] hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto hidden-scrollbar">
              <form id="matchForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--accent)] mb-3">Información Principal</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormInput label="Rival *" name="opponent" register={register("opponent")} error={errors.opponent} />
                    {loadingVenues ? (
                      <div className="flex flex-col gap-1.5 justify-end mb-2">
                         <span className="text-sm font-medium text-[var(--text-secondary)]">Pabellón *</span>
                         <div className="h-10 bg-white/5 rounded-lg border border-white/10 flex items-center px-3 animate-pulse">
                           <FontAwesomeIcon icon={faSpinner} className="animate-spin text-white/50" />
                           <span className="ml-2 text-xs text-white/50">Cargando instalaciones...</span>
                         </div>
                      </div>
                    ) : (
                      <FormSelect label="Pabellón *" name="venue_id" register={register("venue_id")} options={venueOptions} error={errors.venue_id} />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormDate label="Fecha *" name="date" register={register("date")} error={errors.date} />
                  <FormTime label="Hora *" name="time" register={register("time")} error={errors.time} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[var(--accent)] mb-3">Clasificación</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormSelect label="Temporada *" name="season" register={register("season")} options={[
                      { value: "2023/24", label: "2023/24" },
                      { value: "2024/25", label: "2024/25" },
                      { value: "2025/26", label: "2025/26" },
                    ]} error={errors.season} />
                    <FormSelect label="Género *" name="gender" register={register("gender")} options={[
                      { value: "male", label: "Masculino" },
                      { value: "female", label: "Femenino" },
                    ]} error={errors.gender} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput label="URL del Video" name="video_url" register={register("video_url")} error={errors.video_url} placeholder="https://youtube.com/..." />
                  <FormInput label="Notas Externas" name="notes" register={register("notes")} error={errors.notes} placeholder="Alguna lesión, retraso..." />
                </div>

                <div className="mt-6 border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white text-sm font-semibold">Sets Finalizados (Opcional)</h3>
                    {fields.length < 5 && (
                      <button
                        type="button"
                        onClick={() => append({ team_score: 0, opponent_score: 0 })}
                        className="text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition"
                      >
                        <FontAwesomeIcon icon={faPlus} className="mr-1.5" />
                        Añadir Set
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-end gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                        <div className="w-16 flex-shrink-0 text-center text-xs font-bold text-[var(--text-muted)] self-center pt-1">
                          SET {index + 1}
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Nosotros</label>
                          <input
                            type="number"
                            {...register(`match_sets.${index}.team_score`, { valueAsNumber: true })}
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-red-500 outline-none text-center"
                            min={0}
                          />
                        </div>
                        <div className="text-[var(--text-muted)] font-black self-center pt-2">-</div>
                        <div className="flex-1">
                          <label className="block text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Rival</label>
                          <input
                            type="number"
                            {...register(`match_sets.${index}.opponent_score`, { valueAsNumber: true })}
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-red-500 outline-none text-center"
                            min={0}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="h-[38px] px-3 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition self-end"
                        >
                          <FontAwesomeIcon icon={faMinus} />
                        </button>
                      </div>
                    ))}
                    {fields.length === 0 && (
                      <div className="text-xs text-center text-white/30 py-3 border border-dashed border-white/10 rounded-xl">
                        No hay sets registrados
                      </div>
                    )}
                  </div>
                </div>

                {message && (
                  <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === "success" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                    <span>{message.text}</span>
                  </div>
                )}
              </form>
            </div>

            <div className="p-5 border-t border-white/5 flex flex-wrap-reverse sm:flex-nowrap gap-3 items-center justify-between bg-black/20 rounded-b-2xl">
              {initialData ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting || isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2 border border-transparent hover:border-red-500/20 w-full sm:w-auto justify-center"
                >
                  <FontAwesomeIcon icon={isDeleting ? faSpinner : faTrash} spin={isDeleting} />
                  Eliminar
                </button>
              ) : <div className="hidden sm:block" />}

              <div className="flex gap-3 w-full sm:w-auto justify-end">
                <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent">
                  Cancelar
                </button>
                <button type="submit" form="matchForm" disabled={isSubmitting || loadingVenues || isDeleting} className="btn-primary min-w-[130px] flex justify-center items-center">
                  {isSubmitting ? <FontAwesomeIcon icon={faSpinner} spin /> : initialData ? "Guardar Cambios" : "Crear Partido"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
