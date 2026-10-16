"use client";

import Image from "next/image";
import { prettyTeamName } from "@/lib/fed/linkPlan";
import type { CompetitiveStats } from "@/lib/stats/competitive/build";
import { MIN_MATCHES_FOR_CARD } from "@/lib/stats/competitive/card";
import { ordinal } from "./format";
import { Meter, useCountUp } from "./ui";

/** La ficha es un objeto de colección: lleva su propia superficie oscura en ambos temas. */
const CARD = {
  bg: "#141418",
  line: "rgba(255,255,255,0.12)",
  text: "#f0f0f5",
  muted: "#a6a6b6",
} as const;

function tierOf(ovr: number | null): { label: string; color: string } {
  if (ovr === null) return { label: "Sin ficha", color: CARD.muted };
  if (ovr >= 85) return { label: "Oro", color: "#e6b93f" };
  if (ovr >= 70) return { label: "Plata", color: "#cdd0da" };
  return { label: "Bronce", color: "#c98f5d" };
}

export default function TeamCardPanel({ stats }: Readonly<{ stats: CompetitiveStats }>) {
  const { card, previousCard } = stats;
  const carried = Boolean(card?.provisional && previousCard && !previousCard.provisional);
  const shown = carried ? previousCard : card;
  const ovr = useCountUp(shown?.ovr ?? null);
  const tier = tierOf(shown?.ovr ?? null);

  if (!shown) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Todavía no hay una liga con nuestro equipo en esta temporada.
      </p>
    );
  }

  const missing = card ? Math.max(0, MIN_MATCHES_FOR_CARD - card.played) : MIN_MATCHES_FOR_CARD;

  return (
    <section aria-label="Ficha del equipo" className="w-full max-w-[19.5rem]">
      <article
        className="relative overflow-hidden rounded-2xl p-5"
        style={{
          background: CARD.bg,
          color: CARD.text,
          border: `1px ${carried ? "dashed" : "solid"} ${CARD.line}`,
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              className="text-[3.25rem] font-extrabold leading-none tabular-nums tracking-tight"
              style={{ color: tier.color }}
              aria-label={shown.ovr === null ? "Sin valoración global todavía" : `Valoración global ${shown.ovr}`}
            >
              {ovr ?? "—"}
            </p>
            <p className="mt-1.5 text-xs font-semibold" style={{ color: CARD.muted }}>
              Valoración · {tier.label}
            </p>
          </div>
          <Image
            src="/logo/logo_blanco_128.webp"
            alt=""
            width={52}
            height={52}
            className="size-[52px] shrink-0 object-contain"
          />
        </div>

        <div className="mt-5">
          <h3 className="text-base font-semibold leading-snug">{prettyTeamName(shown.teamName)}</h3>
          <p className="mt-1 text-sm tabular-nums" style={{ color: CARD.muted }}>
            {shown.position !== null ? `${ordinal(shown.position)} de ${shown.teams} · ` : ""}
            {shown.leaguePoints} pts · {shown.wins}V {shown.losses}D
          </p>
          {carried ? (
            <p className="mt-2 inline-flex rounded-md px-1.5 py-0.5 text-[0.7rem] font-semibold" style={{ background: "rgba(255,255,255,0.08)", color: CARD.text }}>
              Ficha de {shown.season}
            </p>
          ) : null}
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 pt-5" style={{ borderTop: `1px solid ${CARD.line}` }}>
          {shown.attributes.map((a) => (
            <div key={a.key} title={a.detail}>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-xs font-medium" style={{ color: CARD.muted }}>
                  {a.label}
                </dt>
                <dd className="text-xl font-bold tabular-nums">{a.value ?? "—"}</dd>
              </div>
              <Meter
                className="mt-1.5"
                value={a.value === null ? null : ((a.value - 45) / 54) * 100}
                tone={tier.color}
                label={a.label}
              />
            </div>
          ))}
        </dl>
      </article>

      {card && card.provisional ? (
        <div className="mt-4">
          <p className="text-sm text-[var(--text-secondary)]">
            {card.played === 0
              ? `La ficha de ${card.season} se desbloquea tras ${MIN_MATCHES_FOR_CARD} partidos.`
              : `Faltan ${missing} partido${missing === 1 ? "" : "s"} para la ficha de ${card.season}.`}
          </p>
          <Meter
            className="mt-2 max-w-[19.5rem]"
            value={(card.played / MIN_MATCHES_FOR_CARD) * 100}
            label={`Partidos para desbloquear la ficha: ${card.played} de ${MIN_MATCHES_FOR_CARD}`}
          />
        </div>
      ) : null}

      <details className="group mt-4 text-sm">
        <summary className="cursor-pointer text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
          Cómo sale cada número
        </summary>
        <ul className="mt-2 space-y-1.5 text-[var(--text-muted)]">
          {shown.attributes.map((a) => (
            <li key={a.key}>
              <span className="font-medium text-[var(--text-secondary)]">{a.label}:</span> {a.detail}
            </li>
          ))}
          <li className="pt-1">
            Cada atributo compara con el resto de equipos del grupo (45 = el peor, 99 = el mejor). La valoración
            mezcla el nivel en la liga (40 %) y los atributos.
          </li>
        </ul>
      </details>
    </section>
  );
}
