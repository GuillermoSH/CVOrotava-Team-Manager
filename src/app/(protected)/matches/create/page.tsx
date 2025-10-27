"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormLayout,
  FormInput,
  FormDate,
  FormTime,
  FormSelect,
} from "@/components/ui/forms";
import { getCurrentSeason } from "@/utils/getCurrentSeason";
import { useUser } from "@/contexts/UserContext";

const matchSchema = z.object({
  date: z.string().min(1, "La fecha es obligatoria"),
  time: z.string().min(1, "La hora es obligatoria"),
  opponent: z.string().min(2, "El rival es obligatorio"),
  season: z.string().min(4, "Ej: 2025/2026"),
  result: z.string().optional(),
  video_url: z
    .string()
    .url("Debe ser una URL válida")
    .optional()
    .or(z.literal("")),
  notes: z.string().optional(),
  gender: z.enum(["male", "female"], { message: "El género es obligatorio" }),
  venue_id: z.string().uuid("Selecciona un pabellón válido"),
});

type MatchFormValues = z.infer<typeof matchSchema>;

type VenueOption = {
  id: string;
  venue_name: string;
  location_type: string;
};

export default function MatchCreatePage() {
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const { user } = useUser();

  useEffect(() => {
    async function fetchVenues() {
      const res = await fetch("/api/venues");
      const data = await res.json();
      setVenues(data);
    }
    fetchVenues();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<MatchFormValues>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
      date: "",
      time: "",
      opponent: "",
      season: getCurrentSeason(),
      result: "",
      video_url: "",
      notes: "",
      venue_id: "",
      gender: user?.gender ?? undefined,
    },
  });

  const uniqueVenues = Array.from(
    new Map(venues.map((v) => [v.venue_name, v])).values()
  );

  const groupedVenues = uniqueVenues.reduce(
    (acc, v) => {
      if (v.location_type === "home") acc.home.push(v);
      else if (v.location_type === "away") acc.away.push(v);
      else if (v.location_type === "outside_island") acc.trip.push(v);
      return acc;
    },
    { home: [], away: [], trip: [] } as Record<
      "home" | "away" | "trip",
      VenueOption[]
    >
  );

  const venueOptions = [
    ...(groupedVenues.home.length > 0
      ? [
          {
            label: "🏠 Casa",
            options: groupedVenues.home.map((v) => ({
              value: v.id,
              label: v.venue_name,
            })),
          },
        ]
      : []),
    ...(groupedVenues.away.length > 0
      ? [
          {
            label: "🚗 Fuera (misma isla)",
            options: groupedVenues.away.map((v) => ({
              value: v.id,
              label: v.venue_name,
            })),
          },
        ]
      : []),
    ...(groupedVenues.trip.length > 0
      ? [
          {
            label: "✈️ Viaje (fuera de la isla)",
            options: groupedVenues.trip.map((v) => ({
              value: v.id,
              label: v.venue_name,
            })),
          },
        ]
      : []),
  ];

  const onSubmit = async (data: MatchFormValues) => {
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) alert("❌ Error al crear el partido");
    else {
      alert("✅ Partido creado con éxito");
      reset();
    }
  };

  return (
    <main className="flex justify-center w-full px-2 py-4 md:px-4 md:py-10">
      <div className="w-full max-w-2xl">
        <FormLayout
          title="🏐 Crear Partido"
          description="Introduce los datos del encuentro."
          onSubmit={handleSubmit(onSubmit)}
          loading={isSubmitting}
          buttonText="Guardar Partido"
        >
          {/* 📅 Fecha y hora */}
          <div className="grid grid-cols-2 gap-4">
            <FormDate
              label="Fecha *"
              name="date"
              register={register("date")}
              error={errors.date}
            />
            <FormTime
              label="Hora *"
              name="time"
              register={register("time")}
              error={errors.time}
            />
          </div>

          {/* ⚔️ Rival y Género */}
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Rival *"
              name="opponent"
              register={register("opponent")}
              error={errors.opponent}
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

          {/* 🗓️ Temporada, Resultado, Vídeo */}
          <div className="grid grid-cols-2 gap-4">
            {/* 🏟️ Pabellón */}
            <FormSelect
              label="Pabellón *"
              name="venue_id"
              register={register("venue_id")}
              options={venueOptions}
              error={errors.venue_id}
            />
            <FormInput
              label="Temporada *"
              name="season"
              register={register("season")}
              error={errors.season}
            />
          </div>
        </FormLayout>
      </div>
    </main>
  );
}
