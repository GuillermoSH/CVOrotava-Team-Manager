"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faSpinner, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FormInput, FormSelect } from "@/components/ui/forms";
import { getCurrentSeason } from "@/utils/getCurrentSeason";
import { useUser } from "@/contexts/UserContext";

const videoSchema = z.object({
  id: z.string().optional(),
  url: z
    .string()
    .url("Debe ser una URL válida")
    .min(1, "La URL es obligatoria"),
  category: z.enum(["match", "training"], {
    message: "Selecciona una categoría",
  }),
  season: z.string().min(4, "Ejemplo: 2025/2026"),
  competition_type: z.enum(["league", "friendly"], {
    message: "Selecciona el tipo de competición",
  }),
  gender: z.enum(["male", "female"], {
    message: "Selecciona el género",
  }),
});

export type VideoFormValues = z.infer<typeof videoSchema>;

type VideoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: VideoFormValues;
};

export default function VideoModal({ isOpen, onClose, onSuccess, initialData }: Readonly<VideoModalProps>) {
  const { user } = useUser();
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<VideoFormValues>({
    resolver: zodResolver(videoSchema),
    defaultValues: initialData || {
      url: "",
      category: "match",
      season: getCurrentSeason(),
      competition_type: "league",
      gender: user?.gender ?? "male",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset(initialData);
      } else {
        reset({
          url: "",
          category: "match",
          season: getCurrentSeason(),
          competition_type: "league",
          gender: user?.gender ?? "male",
        });
      }
      setMessage(null);
    }
  }, [isOpen, initialData, reset, user]);

  const onSubmit = async (data: VideoFormValues) => {
    setMessage(null);

    try {
      const token = (await (await import("@/lib/supabase/client")).supabase.auth.getSession())
        .data.session?.access_token;

      if (!token) throw new Error("No hay sesión activa");

      const isEdit = !!data.id;
      const url = isEdit ? `/api/videos/${data.id}` : "/api/videos";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.error || "Error al guardar el video");
      }

      setMessage({ type: "success", text: isEdit ? "Video actualizado con éxito" : "Video añadido con éxito" });
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
    if (!confirm("¿Estás seguro de que deseas eliminar este vídeo? Esta acción no se puede deshacer.")) return;
    
    setIsDeleting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/videos/${initialData.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al eliminar el vídeo");
      }
      setMessage({ type: "success", text: "Vídeo eliminado correctamente" });
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
            className="relative w-full max-w-xl bg-[#121214] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="text-xl font-bold text-white">
                {initialData ? "✏️ Editar Vídeo" : "📹 Añadir Vídeo"}
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
              <form id="videoForm" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                {/* 🎥 URL del video */}
                <FormInput
                  label="URL de YouTube *"
                  name="url"
                  register={register("url")}
                  error={errors.url}
                  placeholder="https://youtube.com/watch?v=..."
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 📂 Categoría */}
                  <FormSelect
                    label="Categoría *"
                    name="category"
                    register={register("category")}
                    options={[
                      { value: "match", label: "Partido" },
                      { value: "training", label: "Entrenamiento" },
                    ]}
                    error={errors.category}
                  />

                  {/* 🗓️ Temporada */}
                  <FormSelect 
                    label="Temporada *" 
                    name="season" 
                    register={register("season")} 
                    options={[
                      { value: "2023/24", label: "2023/24" },
                      { value: "2024/25", label: "2024/25" },
                      { value: "2025/26", label: "2025/26" },
                    ]} 
                    error={errors.season} 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormSelect
                    label="Competición *"
                    name="competition_type"
                    register={register("competition_type")}
                    options={[
                      { value: "league", label: "Liga" },
                      { value: "friendly", label: "Amistoso" },
                    ]}
                    error={errors.competition_type}
                  />
                  <FormSelect
                    label="Género *"
                    name="gender"
                    register={register("gender")}
                    options={[
                      { value: "male", label: "Masculino" },
                      { value: "female", label: "Femenino" },
                    ]}
                    error={errors.gender}
                  />
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
                <button type="submit" form="videoForm" disabled={isSubmitting || isDeleting} className="btn-primary min-w-[130px] flex justify-center items-center">
                  {isSubmitting ? <FontAwesomeIcon icon={faSpinner} spin /> : initialData ? "Guardar Cambios" : "Añadir Vídeo"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
