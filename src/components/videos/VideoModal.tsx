"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faSpinner, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FormInput, FormSelect } from "@/components/ui/forms";
import { getCurrentSeason, getSeasonSelectOptions } from "@/utils/getCurrentSeason";
import { useUser } from "@/contexts/UserContext";
import { VIDEO_TYPES, VIDEO_TYPE_OPTIONS, MATCH_VIDEO_TYPES } from "@/lib/videos/constants";
import MatchPicker from "@/components/videos/MatchPicker";

const videoSchema = z.object({
  id: z.string().optional(),
  url: z
    .string()
    .url("Debe ser una URL válida")
    .min(1, "La URL es obligatoria"),
  video_type: z.enum(VIDEO_TYPES, {
    message: "Selecciona el tipo de vídeo",
  }),
  season: z.string().min(4, "Ejemplo: 2025/2026"),
  gender: z.enum(["male", "female"], {
    message: "Selecciona el género",
  }),
  match_id: z.string().optional(),
});

export type VideoFormValues = z.infer<typeof videoSchema>;

type VideoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: VideoFormValues;
};

export default function VideoModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: Readonly<VideoModalProps>) {
  const { user } = useUser();
  const reduceMotion = useReducedMotion();
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<VideoFormValues>({
    resolver: zodResolver(videoSchema),
    defaultValues: initialData || {
      url: "",
      video_type: "league_match",
      season: getCurrentSeason(),
      gender: user?.gender ?? "male",
      match_id: "",
    },
  });

  const videoType = watch("video_type");
  const season = watch("season");
  const gender = watch("gender");
  const matchId = watch("match_id") ?? "";
  const showMatchPicker = MATCH_VIDEO_TYPES.includes(videoType);

  useEffect(() => {
    if (!showMatchPicker) {
      setValue("match_id", "");
    }
  }, [showMatchPicker, setValue]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      reset(initialData);
    } else {
      reset({
        url: "",
        video_type: "league_match",
        season: getCurrentSeason(),
        gender: user?.gender ?? "male",
        match_id: "",
      });
    }
    setMessage(null);
  }, [isOpen, initialData, reset, user]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const onSubmit = async (data: VideoFormValues) => {
    setMessage(null);

    try {
      const isEdit = !!data.id;
      const url = isEdit ? `/api/videos/${data.id}` : "/api/videos";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          match_id: data.match_id?.trim() ? data.match_id : null,
        }),
      });

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.error || "Error al guardar el vídeo");
      }

      setMessage({
        type: "success",
        text: isEdit ? "Vídeo actualizado" : "Vídeo añadido",
      });
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
    if (
      !confirm(
        "¿Eliminar este vídeo? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }

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
      setMessage({ type: "success", text: "Vídeo eliminado" });
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="video-modal-title"
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            initial={
              reduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduceMotion
                ? undefined
                : { opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.18 } }
            }
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="relative flex max-h-[min(92dvh,100%)] w-full max-w-xl flex-col rounded-t-2xl border border-[var(--glass-border)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-card-hover)] sm:max-h-[90vh] sm:rounded-2xl"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--glass-border)] px-4 py-4 sm:px-5">
              <h2
                id="video-modal-title"
                className="text-lg font-semibold tracking-tight text-[var(--text-primary)] sm:text-xl"
              >
                {initialData ? "Editar vídeo" : "Añadir vídeo"}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="inline-flex h-10 w-10 cursor-pointer touch-manipulation items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-surface)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              <form
                id="videoForm"
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5"
              >
                <FormInput
                  label="URL de YouTube *"
                  name="url"
                  register={register("url")}
                  error={errors.url}
                  placeholder="https://youtube.com/watch?v=..."
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormSelect
                    label="Tipo *"
                    name="video_type"
                    control={control}
                    options={VIDEO_TYPE_OPTIONS}
                    error={errors.video_type}
                  />

                  <FormSelect
                    label="Temporada *"
                    name="season"
                    control={control}
                    options={getSeasonSelectOptions()}
                    error={errors.season}
                  />
                </div>

                <FormSelect
                  label="Género *"
                  name="gender"
                  control={control}
                  options={[
                    { value: "male", label: "Masculino" },
                    { value: "female", label: "Femenino" },
                  ]}
                  error={errors.gender}
                />

                {showMatchPicker && (
                  <MatchPicker
                    season={season}
                    gender={gender}
                    value={matchId}
                    forMatchId={initialData?.match_id}
                    onChange={(id) =>
                      setValue("match_id", id, { shouldValidate: true })
                    }
                  />
                )}

                {message && (
                  <div
                    role="status"
                    className={`rounded-[var(--radius-md)] border px-3 py-2.5 text-sm ${
                      message.type === "success"
                        ? "border-[var(--color-success)]/30 bg-[var(--color-success-muted)] text-[var(--color-success)]"
                        : "border-[var(--color-danger)]/35 bg-[var(--color-danger-muted)] text-[var(--payment-badge-pending-text)]"
                    }`}
                  >
                    {message.text}
                  </div>
                )}
              </form>
            </div>

            <div
              className="flex shrink-0 flex-col gap-3 border-t border-[var(--glass-border)] bg-[var(--surface-faint)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              style={{
                paddingBottom:
                  "max(1rem, env(safe-area-inset-bottom, 0px))",
              }}
            >
              {initialData ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting || isSubmitting}
                  className="inline-flex min-h-11 w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium text-[var(--color-danger)] transition-colors hover:border-[var(--color-danger)]/25 hover:bg-[var(--color-danger-muted)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  <FontAwesomeIcon
                    icon={isDeleting ? faSpinner : faTrash}
                    spin={isDeleting}
                  />
                  Eliminar
                </button>
              ) : (
                <span className="hidden sm:block" />
              )}

              <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex min-h-11 flex-1 cursor-pointer touch-manipulation items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-surface)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:flex-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="videoForm"
                  disabled={isSubmitting || isDeleting}
                  className="btn-primary min-h-11 min-w-[8.5rem] flex-1 touch-manipulation disabled:cursor-not-allowed sm:flex-none"
                >
                  {isSubmitting ? (
                    <FontAwesomeIcon icon={faSpinner} spin />
                  ) : initialData ? (
                    "Guardar"
                  ) : (
                    "Añadir vídeo"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
