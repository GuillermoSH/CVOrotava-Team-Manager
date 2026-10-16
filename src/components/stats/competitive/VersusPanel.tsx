"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faArrowUp, faMinus } from "@fortawesome/free-solid-svg-icons";
import type { CompetitiveStats } from "@/lib/stats/competitive/build";
import AchievementsPanel from "./AchievementsPanel";
import { ordinal } from "./format";
import { Meter } from "./ui";

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

function SamePoint({ stats }: Readonly<{ stats: CompetitiveStats }>) {
  const { versus, previousCard, card } = stats;

  if (!stats.hasPrevious || !previousCard) {
    return <p className="text-sm text-[var(--text-muted)]">No hay datos de la temporada anterior con los que comparar.</p>;
  }
  if (!versus) {
    return (
      <p className="max-w-prose text-sm text-[var(--text-muted)]">
        Se activa con el primer partido de liga. El año pasado ({previousCard.season}) acabamos{" "}
        {previousCard.position !== null ? ordinal(previousCard.position) : "sin puesto"} con {previousCard.leaguePoints}{" "}
        puntos.
      </p>
    );
  }

  const diff = versus.pointsNow - versus.pointsThen;
  const goal = versus.previousFinalPoints + 1;
  const beaten = versus.pointsNow >= goal;

  return (
    <div className="max-w-xl">
      <p className="text-sm text-[var(--text-secondary)]">
        Con {versus.played} {plural(versus.played, "partido", "partidos")} de liga jugados:
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-8">
        <div>
          <dt className="text-sm text-[var(--text-muted)]">Ahora · {card?.season}</dt>
          <dd className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
            {versus.pointsNow} <span className="text-base font-medium text-[var(--text-secondary)]">pts</span>
          </dd>
          <dd className="text-sm text-[var(--text-muted)]">
            {versus.winsNow} {plural(versus.winsNow, "victoria", "victorias")}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-[var(--text-muted)]">Hace un año · {previousCard.season}</dt>
          <dd className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-[var(--text-secondary)]">
            {versus.pointsThen} <span className="text-base font-medium">pts</span>
          </dd>
          <dd className="text-sm text-[var(--text-muted)]">
            {versus.winsThen} {plural(versus.winsThen, "victoria", "victorias")}
          </dd>
        </div>
      </dl>

      <p
        className={`mt-4 flex items-center gap-2 text-sm font-semibold ${
          diff > 0
            ? "text-[var(--color-success)]"
            : diff < 0
              ? "text-[color-mix(in_srgb,var(--color-danger)_72%,var(--text-primary))]"
              : "text-[var(--text-secondary)]"
        }`}
      >
        <FontAwesomeIcon icon={diff > 0 ? faArrowUp : diff < 0 ? faArrowDown : faMinus} aria-hidden />
        {diff === 0
          ? "Mismos puntos que el año pasado en este punto"
          : `${Math.abs(diff)} ${plural(Math.abs(diff), "punto", "puntos")} ${diff > 0 ? "más" : "menos"} que el año pasado`}
      </p>

      <div className="mt-6 border-t border-[var(--glass-border)] pt-5">
        <p className="text-sm text-[var(--text-secondary)]">
          {beaten
            ? `Objetivo superado: ya tenemos más de los ${versus.previousFinalPoints} puntos con los que acabamos el año pasado.`
            : `Objetivo: superar los ${versus.previousFinalPoints} puntos con los que acabamos el año pasado${
                versus.previousFinalPosition !== null ? ` (${ordinal(versus.previousFinalPosition)})` : ""
              }.`}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Meter className="flex-1" value={Math.min(100, (versus.pointsNow / goal) * 100)} label="Progreso hacia superar los puntos del año pasado" />
          <span className="text-xs tabular-nums text-[var(--text-muted)]">
            {Math.min(versus.pointsNow, goal)} de {goal}
          </span>
        </div>
      </div>
    </div>
  );
}

function Records({ stats }: Readonly<{ stats: CompetitiveStats }>) {
  if (stats.records.length === 0) return null;
  const prev = stats.previousCard?.season;
  return (
    <div className="max-w-xl overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Récords de esta temporada frente a la anterior</caption>
        <thead>
          <tr className="border-b border-[var(--glass-border)] text-xs text-[var(--text-muted)]">
            <th scope="col" className="py-2 text-left font-semibold">
              Liga regular
            </th>
            <th scope="col" className="px-2 py-2 text-right font-semibold">
              {stats.card?.season}
            </th>
            <th scope="col" className="px-2 py-2 text-right font-semibold">
              {prev ?? "Año pasado"}
            </th>
            <th scope="col" className="w-8 py-2" aria-label="Comparación" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--glass-border)]">
          {stats.records.map((r) => {
            const better = r.previous === null ? null : r.higherIsBetter ? r.current > r.previous : r.current < r.previous;
            const same = r.previous !== null && r.current === r.previous;
            return (
              <tr key={r.key}>
                <th scope="row" className="py-2.5 text-left font-normal text-[var(--text-secondary)]">
                  {r.label}
                </th>
                <td className="px-2 py-2.5 text-right text-base font-bold tabular-nums">{r.current}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-[var(--text-muted)]">{r.previous ?? "—"}</td>
                <td className="py-2.5 text-right">
                  {r.previous === null ? null : same ? (
                    <>
                      <FontAwesomeIcon icon={faMinus} className="text-xs text-[var(--text-muted)]" aria-hidden />
                      <span className="sr-only">Igual que el año pasado</span>
                    </>
                  ) : better ? (
                    <>
                      <FontAwesomeIcon icon={faArrowUp} className="text-xs text-[var(--color-success)]" aria-hidden />
                      <span className="sr-only">Mejor que el año pasado</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faArrowDown} className="text-xs text-[color-mix(in_srgb,var(--color-danger)_72%,var(--text-primary))]" aria-hidden />
                      <span className="sr-only">Peor que el año pasado</span>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function VersusPanel({ stats }: Readonly<{ stats: CompetitiveStats }>) {
  if (!stats.hasLeague) {
    return (
      <section>
        <h2 className="mb-2 text-lg font-semibold tracking-tight sm:text-xl">Vs. año pasado</h2>
        <p className="text-sm text-[var(--text-muted)]">Todavía no hay una liga con nuestro equipo en esta temporada.</p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="same-point-title">
        <h2 id="same-point-title" className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">
          Mismo punto del año pasado
        </h2>
        <SamePoint stats={stats} />
      </section>

      <section aria-labelledby="records-title">
        <h2 id="records-title" className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">
          Récords
        </h2>
        <Records stats={stats} />
      </section>

      <section aria-labelledby="achievements-title">
        <h2 id="achievements-title" className="text-lg font-semibold tracking-tight sm:text-xl">
          Logros de la temporada
        </h2>
        <p className="mb-4 mt-1 max-w-prose text-sm text-[var(--text-muted)]">
          Cuentan los partidos de liga regular, salvo «Venganza», que cuenta todas las competiciones. Se reinician cada
          temporada.
        </p>
        <AchievementsPanel stats={stats} />
      </section>
    </div>
  );
}
