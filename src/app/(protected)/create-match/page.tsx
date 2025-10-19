"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormLayout,
  FormInput,
  FormDate,
  FormTime,
} from "@/components/ui/forms";

const matchSchema = z.object({
  date: z.string().min(1, "La fecha es obligatoria"),
  time: z.string().min(1, "La hora es obligatoria"),
  opponent: z.string().min(2, "El rival es obligatorio"),
  location: z.string().min(2, "El lugar es obligatorio"),
  season: z.string().min(4, "Ej: 2025/2026"),
  location_url: z.string().url("Debe ser una URL válida").optional().or(z.literal("")),
  result: z.string().optional(),
  video_url: z.string().url("Debe ser una URL válida").optional().or(z.literal("")),
  notes: z.string().optional(),
});

type MatchFormValues = z.infer<typeof matchSchema>;

export default function MatchCreatePage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MatchFormValues>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
      date: "",
      time: "",
      opponent: "",
      location: "",
      season: "",
      location_url: "",
      result: "",
      video_url: "",
      notes: "",
    },
  });

  const onSubmit = async (data: MatchFormValues) => {
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) alert("Error al crear el partido");
    else alert("✅ Partido creado con éxito");
  };

  return (
    <main className="flex justify-center w-full px-1 py-4 md:px-4 md:py-10">
      <div className="w-full max-w-3xl">
        <FormLayout
          title="⚽ Crear Partido"
          description="Introduce los datos del encuentro."
          onSubmit={handleSubmit(onSubmit)}
          loading={isSubmitting}
          buttonText="Guardar Partido"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormDate label="Fecha *" name="date" register={register("date")} error={errors.date} />
            <FormTime label="Hora *" name="time" register={register("time")} error={errors.time} />
          </div>

          <FormInput label="Rival *" name="opponent" register={register("opponent")} error={errors.opponent} />
          <FormInput label="Lugar *" name="location" register={register("location")} error={errors.location} />
          <FormInput label="Temporada *" name="season" register={register("season")} error={errors.season} />

          <FormInput
            label="URL del lugar (Google Maps)"
            name="location_url"
            type="url"
            register={register("location_url")}
            error={errors.location_url}
          />
        </FormLayout>
      </div>
    </main>
  );
}
