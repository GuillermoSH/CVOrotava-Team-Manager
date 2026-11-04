import type { CompetitionMatch, CompetitionTeam } from "./build";
import type { Ratio, TeamProfile } from "./teamProfile";

/**
 * Resumen rápido de un equipo de cara a un partido contra él: los datos de mayor impacto de su ficha,
 * ordenados por lo que se desvían de lo normal y con el tamaño de la muestra por delante. Puro: parte
 * de la ficha ya calculada. Todo lo que se dice lleva su recuento («3 de 5») para poder juzgarlo, y
 * nada se afirma con menos de `MIN_SAMPLE` casos.
 */

export type BriefTone = "strength" | "weakness" | "habit" | "info";

export type BriefFact = {
  id: string;
  tone: BriefTone;
  text: string;
  /** Más alto = más relevante; ordena y decide qué entra. */
  weight: number;
  /** Sección de la ficha donde está el detalle (ancla). */
  section: string;
};

export type TeamBrief = {
  /** Una línea con cómo va: resultados y racha reciente. */
  headline: string | null;
  /** Lo que ha pasado entre el equipo y el club esta temporada. */
  versusUs: string[];
  facts: BriefFact[];
  /** Aviso cuando hay pocas actas: los porcentajes se apoyan en muy pocos casos. */
  caution: string | null;
};

/** Casos mínimos para afirmar algo de un porcentaje. */
export const MIN_SAMPLE = 4;
/** Datos que se enseñan en el resumen. */
export const MAX_FACTS = 6;

const pct = (r: Ratio) => Math.round((r.n / r.of) * 100);
const per = (r: Ratio) => `${r.n} de ${r.of}`;
const dec = (v: number, d = 1) => v.toLocaleString("es-ES", { maximumFractionDigits: d, minimumFractionDigits: d });

/** Fiabilidad de un porcentaje según los casos: 0 con pocos, 1 desde 10. */
const reliability = (of: number) => Math.min(1, Math.max(0, (of - 2) / 8));

type Played = Pick<CompetitionMatch, "id" | "status" | "homeId" | "awayId" | "homeSets" | "awaySets" | "date">;

/** Resultados del equipo por orden de fecha: true = ganó. */
function results(teamId: number, matches: Played[]): { won: boolean; sf: number; sa: number; rivalId: number | null; date: string | null }[] {
  return matches
    .filter((m) => m.status === "played" && (m.homeId === teamId || m.awayId === teamId) && m.homeSets !== null && m.awaySets !== null)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.id - b.id)
    .map((m) => {
      const home = m.homeId === teamId;
      const sf = (home ? m.homeSets : m.awaySets) as number;
      const sa = (home ? m.awaySets : m.homeSets) as number;
      return { won: sf > sa, sf, sa, rivalId: home ? m.awayId : m.homeId, date: m.date };
    });
}

export function buildTeamBrief(profile: TeamProfile, matches: Played[], teams: Record<number, CompetitionTeam>): TeamBrief {
  // Sin partidos jugados no hay nada que resumir
  if (profile.played === 0) return { headline: null, versusUs: [], facts: [], caution: null };

  const facts: BriefFact[] = [];
  const add = (f: BriefFact) => facts.push(f);
  const res = results(profile.teamId, matches);

  // ─ Cómo va ─
  let headline: string | null = null;
  if (res.length > 0) {
    const last = res.slice(-5).map((r) => (r.won ? "V" : "D")).join(" ");
    headline = `${profile.record.won} ${profile.record.won === 1 ? "victoria" : "victorias"} y ${profile.record.lost} ${profile.record.lost === 1 ? "derrota" : "derrotas"} (sets ${profile.record.setsFor}-${profile.record.setsAgainst}). Últimos partidos: ${last}.`;
  }

  // ─ Lo que ha pasado contra nosotros ─
  const versusUs = res
    .filter((r) => r.rivalId !== null && teams[r.rivalId]?.isOurs)
    .map((r) => `${r.won ? "Ganó" : "Perdió"} ${r.sf}-${r.sa} contra el club${r.date ? ` (${r.date.split("-").reverse().join("/")})` : ""}.`);

  // ─ Sets ─
  const first = profile.sets.firstSet;
  if (first.of >= MIN_SAMPLE) {
    const p = pct(first);
    if (p >= 65 || p <= 35) {
      add({
        id: "first-set",
        tone: p >= 65 ? "strength" : "weakness",
        text: p >= 65 ? `Sale fuerte: gana el primer set en ${per(first)} partidos.` : `Arranca mal: gana el primer set solo en ${per(first)} partidos.`,
        weight: Math.abs(p - 50) * reliability(first.of),
        section: "t-record",
      });
    }
  }
  const tight = profile.sets.tight;
  if (tight.of >= MIN_SAMPLE) {
    const p = pct(tight);
    if (p >= 65 || p <= 35) {
      add({
        id: "tight",
        tone: p >= 65 ? "strength" : "weakness",
        text: p >= 65 ? `Cierra bien los finales apretados: gana ${per(tight)} sets decididos por 2 puntos o menos.` : `Se le escapan los finales apretados: solo gana ${per(tight)} sets decididos por 2 puntos o menos.`,
        weight: Math.abs(p - 50) * reliability(tight.of) * 1.1,
        section: "t-record",
      });
    }
  }
  const dominance = profile.sets.avgFor !== null && profile.sets.avgAgainst !== null ? profile.sets.avgFor - profile.sets.avgAgainst : null;
  if (dominance !== null && profile.sets.played >= MIN_SAMPLE * 2 && Math.abs(dominance) >= 3) {
    add({
      id: "dominance",
      tone: dominance > 0 ? "strength" : "weakness",
      text: `Sus sets acaban de media ${dec(profile.sets.avgFor ?? 0)}-${dec(profile.sets.avgAgainst ?? 0)}: ${dominance > 0 ? "domina" : "va por debajo en"} el marcador por ${dec(Math.abs(dominance))} puntos por set.`,
      weight: Math.abs(dominance) * 6 * reliability(profile.sets.played),
      section: "t-record",
    });
  }

  // ─ Jugada a jugada ─
  const f = profile.flow;
  if (f.sets >= MIN_SAMPLE) {
    if (f.receive.of >= 20) {
      const rp = pct(f.receive);
      const sp = f.serve.of >= 20 ? pct(f.serve) : null;
      if (rp < 50 || rp >= 68) {
        add({
          id: "receive",
          tone: rp < 50 ? "weakness" : "strength",
          text: rp < 50 ? `Sufre al recibir: pierde más jugadas de las que gana cuando saca el rival (gana el ${rp} %).` : `Muy sólido al recibir: gana el ${rp} % de las jugadas cuando saca el rival.`,
          weight: Math.abs(rp - 58) * 1.2 * reliability(f.sets),
          section: "t-flow",
        });
      }
      if (sp !== null && (sp >= 50 || sp <= 33)) {
        add({
          id: "serve",
          tone: sp >= 50 ? "strength" : "weakness",
          text: sp >= 50 ? `Su saque hace daño: gana el ${sp} % de las jugadas con su saque.` : `Su saque hace poco daño: gana el ${sp} % de las jugadas con su saque.`,
          weight: Math.abs(sp - 42) * 1.2 * reliability(f.sets),
          section: "t-flow",
        });
      }
    }
    if (f.blownLeads.of >= 3 && pct(f.blownLeads) >= 34) {
      add({
        id: "blown",
        tone: "weakness",
        text: `Se le escapan ventajas: pierde ${per(f.blownLeads)} sets en los que llegó a ir 5 puntos por delante.`,
        weight: pct(f.blownLeads) * 0.6 * reliability(f.blownLeads.of + 2),
        section: "t-flow",
      });
    }
    if (f.comebacks.of >= 3 && pct(f.comebacks) >= 40) {
      add({
        id: "comeback",
        tone: "strength",
        text: `Remonta: gana ${per(f.comebacks)} sets en los que llegó a ir 5 puntos por detrás.`,
        weight: pct(f.comebacks) * 0.6 * reliability(f.comebacks.of + 2),
        section: "t-flow",
      });
    }
    if (f.avgRunAgainst !== null && f.avgRunAgainst >= 7) {
      add({
        id: "runs",
        tone: "weakness",
        text: `Sufre rachas largas: el rival suele enlazar ${dec(f.avgRunAgainst)} jugadas seguidas en cada set.`,
        weight: (f.avgRunAgainst - 6) * 12 * reliability(f.sets),
        section: "t-flow",
      });
    }
  }

  // ─ Tiempos muertos ─
  const t = profile.timeouts;
  if (t.sets >= MIN_SAMPLE && t.total >= MIN_SAMPLE) {
    const bits: string[] = [`pide ${dec(t.perSet ?? 0, 1)} por set`];
    if (t.trailing3.of >= MIN_SAMPLE) bits.push(`${per(t.trailing3)} los pide yendo 3 o más puntos por detrás`);
    const total = t.phase.early + t.phase.mid + t.phase.late;
    const top = (["early", "mid", "late"] as const).reduce((a, b) => (t.phase[b] > t.phase[a] ? b : a));
    if (total >= MIN_SAMPLE && t.phase[top] / total >= 0.5) {
      bits.push(`sobre todo ${top === "early" ? "al principio del set" : top === "mid" ? "a mitad de set" : "en la parte final del set"} (${t.phase[top]} de ${total})`);
    }
    add({ id: "timeouts", tone: "habit", text: `Tiempos muertos: ${bits.join("; ")}.`, weight: 18 * reliability(t.sets), section: "t-timeouts" });
  }
  const after = f.afterTimeout.nextPoint;
  if (after.of >= MIN_SAMPLE) {
    const p = pct(after);
    if (p >= 65 || p <= 35) {
      add({
        id: "after-timeout",
        tone: p >= 65 ? "strength" : "weakness",
        text: p >= 65 ? `Sus tiempos muertos funcionan: gana la jugada siguiente en ${per(after)}.` : `Sus tiempos muertos no le sirven: solo gana la jugada siguiente en ${per(after)}.`,
        weight: Math.abs(p - 50) * 0.8 * reliability(after.of),
        section: "t-flow",
      });
    }
  }

  // ─ Alineaciones y cambios ─
  const lu = profile.lineups;
  if (lu.sets >= MIN_SAMPLE && lu.sextets[0]) {
    const s = lu.sextets[0];
    if (s.share >= 0.6) {
      add({ id: "lineup-fixed", tone: "habit", text: `Sexteto casi fijo: ${s.numbers.join("-")} en ${s.count} de ${lu.sets} sets.`, weight: 22 * reliability(lu.sets), section: "t-lineups" });
    } else if (lu.distinctSextets >= Math.min(5, lu.sets - 1)) {
      add({ id: "lineup-changing", tone: "habit", text: `Cambia mucho de sexteto: ${lu.distinctSextets} distintos en ${lu.sets} sets.`, weight: 20 * reliability(lu.sets), section: "t-lineups" });
    }
  }
  const subs = profile.substitutions;
  if (subs.total >= MIN_SAMPLE && profile.timeouts.sets >= MIN_SAMPLE) {
    const bits: string[] = [];
    if ((subs.perSet ?? 0) >= 1.8) bits.push(`cambia mucho (${dec(subs.perSet ?? 0)} por set)`);
    else if ((subs.perSet ?? 0) <= 0.6) bits.push(`cambia poco (${dec(subs.perSet ?? 0)} por set)`);
    const max = Math.max(...subs.byPosition);
    const pos = subs.byPosition.indexOf(max);
    if (subs.total >= 6 && max / subs.total >= 0.4) bits.push(`sobre todo en la posición ${["I", "II", "III", "IV", "V", "VI"][pos]}`);
    if (subs.topIn.length > 0 && subs.topIn[0].times >= 2) bits.push(`quien más entra es ${subs.topIn[0].name} (${subs.topIn[0].times})`);
    if (bits.length > 0) add({ id: "subs", tone: "habit", text: `Cambios: ${bits.join("; ")}.`, weight: 16 * reliability(profile.timeouts.sets), section: "t-subs" });
  }

  // ─ Disciplina ─
  const sanctions = profile.sanctions.W + profile.sanctions.P + profile.sanctions.E + profile.sanctions.D;
  if (sanctions >= 3) {
    add({
      id: "sanctions",
      tone: "info",
      text: `Disciplina: ${sanctions} sanciones en ${profile.withReport} partidos con acta (${profile.sanctions.W} amonestaciones, ${profile.sanctions.P} penalizaciones, ${profile.sanctions.E + profile.sanctions.D} expulsiones o descalificaciones).`,
      weight: 10 + sanctions,
      section: "t-players",
    });
  }

  facts.sort((a, b) => b.weight - a.weight);

  const caution =
    profile.played === 0
      ? null
      : profile.withReport === 0
        ? "Todavía no hay actas leídas de este equipo: solo se ven sus resultados."
        : profile.smallSample
          ? `Solo hay ${profile.withReport} ${profile.withReport === 1 ? "acta" : "actas"} leída${profile.withReport === 1 ? "" : "s"}: tómalo como una pista, no como una regla.`
          : null;

  return { headline, versusUs, facts: facts.slice(0, MAX_FACTS), caution };
}
