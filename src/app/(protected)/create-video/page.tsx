"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  FormLayout,
  FormInput,
  FormSelect,
} from "@/components/ui/forms";
import { getCurrentSeason } from "@/utils/getCurrentSeason";
import { useUser } from "@/contexts/UserContext";

// 🧩 Schema de validación
const videoSchema = z.object({
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

type VideoFormValues = z.infer<typeof videoSchema>;

export default function VideoCreatePage() {
  const router = useRouter();
  const { user } = useUser();
  const [message, setMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<VideoFormValues>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      url: "",
      category: "match",
      season: getCurrentSeason(),
      competition_type: "league",
      gender: user?.gender ?? "male",
    },
  });

  if (!user?.isAdmin) {
    return (
      <main className="flex justify-center items-center min-h-screen text-red-600 font-semibold">
        Acceso denegado ❌
      </main>
    );
  }

  // 🚀 Envío del formulario
  const onSubmit = async (data: VideoFormValues) => {
    setMessage(null);

    try {
      const token = (await (await import("@/lib/supabase/client")).supabase.auth.getSession())
        .data.session?.access_token;

      if (!token) {
        throw new Error("No hay sesión activa");
      }

      const res = await fetch("/api/videos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || "Error al crear el video");
      }

      setMessage("✅ Video creado con éxito");
      reset();
      router.push("/videos");
    } catch (err) {
      if (err instanceof Error) setMessage(`❌ ${err.message}`);
      else setMessage("❌ Error desconocido");
    }
  };

  return (
    <main className="flex justify-center w-full px-2 py-4 md:px-4 md:py-10">
      <div className="w-full max-w-2xl">
        <FormLayout
          title="📹 Añadir Video"
          description="Introduce los detalles del video que deseas subir."
          onSubmit={handleSubmit(onSubmit)}
          loading={isSubmitting}
          buttonText="Guardar Video"
        >
          {/* 🎥 URL del video */}
          <FormInput
            label="URL de YouTube *"
            name="url"
            register={register("url")}
            error={errors.url}
            placeholder="https://youtube.com/watch?v=..."
          />

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

          {/* 🗓️ Temporada / Competición / Género */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormInput
              label="Temporada *"
              name="season"
              register={register("season")}
              error={errors.season}
              placeholder="2025/26"
            />
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

          {/* 💬 Mensaje de estado */}
          {message && (
            <p
              className={`text-sm mt-2 p-2 rounded ${
                message.startsWith("✅")
                  ? "bg-green-600/20 text-green-300"
                  : "bg-red-600/20 text-red-300"
              }`}
            >
              {message}
            </p>
          )}
        </FormLayout>
      </div>
    </main>
  );
}
