import { normalizeTeam } from "./parse";
import type { ActaData, ActaIssue, Side } from "./types";

/**
 * Comprobaciones de un acta ya extraída. Dos niveles:
 *  - internas: lo que el acta dice por dos sitios (el cuadro de resultado y los paneles de cada set)
 *    tiene que cuadrar entre sí;
 *  - contra la federación: los puntos de cada set tienen que ser los que ya tenemos guardados.
 * Un acta que no pasa no se da por buena: se guarda con sus avisos para revisarla, nunca como dato fiable.
 */

const minutesBetween = (a: string | null, b: string | null): number | null => {
  if (!a || !b) return null;
  const [ha, ma] = a.split(":").map(Number);
  const [hb, mb] = b.split(":").map(Number);
  let d = hb * 60 + mb - (ha * 60 + ma);
  if (d < 0) d += 24 * 60; // un partido que cruza la medianoche
  return d;
};

const issue = (level: ActaIssue["level"], code: string, message: string): ActaIssue => ({ level, code, message });

export function validateActa(data: ActaData): ActaIssue[] {
  const out: ActaIssue[] = [];
  const sides: Side[] = ["A", "B"];

  // Cada set: quién gana y por cuánto
  const won: Record<Side, number> = { A: 0, B: 0 };
  const points: Record<Side, number> = { A: 0, B: 0 };
  for (const set of data.sets) {
    const a = set.summary.A.points;
    const b = set.summary.B.points;
    points.A += a;
    points.B += b;
    if (a === b) out.push(issue("error", "set-tie", `Set ${set.number}: empate a ${a} puntos.`));
    else won[a > b ? "A" : "B"]++;

    const max = Math.max(a, b);
    const min = Math.min(a, b);
    const target = set.number === 5 ? 15 : 25;
    if (a !== b && (max < target || (max === target && max - min < 2) || (max > target && max - min !== 2))) {
      // Ni 25-23 ni 27-25: un resultado que no puede ser de un set
      out.push(issue("warning", "set-score", `Set ${set.number}: ${a}-${b} no es un final de set habitual.`));
    }

    // Tiempos muertos y sustituciones: lo que se lee en el panel tiene que ser lo que cuenta el resultado
    for (const s of sides) {
      const side = set[s];
      const sum = set.summary[s];
      // Si leemos MENOS de lo que cuenta el resultado, el acta está incompleta (aviso); si leemos MÁS, hemos
      // inventado datos y es un error de lectura.
      const hasPanel = set.start !== null || side.lineup.length > 0 || side.startsServing !== null;
      if (hasPanel && side.timeouts.length !== sum.timeouts) {
        out.push(
          issue(
            side.timeouts.length > sum.timeouts ? "error" : "warning",
            "timeouts-count",
            `Set ${set.number}, equipo ${s}: ${side.timeouts.length} tiempos muertos leídos y ${sum.timeouts} en el resultado.`
          )
        );
      }
      if (side.timeouts.length > 2) out.push(issue("error", "timeouts-max", `Set ${set.number}, equipo ${s}: más de dos tiempos muertos.`));
      // Cada sustitución cuenta una vez al entrar y otra si el titular vuelve
      const subs = side.substitutions.length + side.substitutions.filter((x) => x.scoreBack !== null).length;
      if (hasPanel && subs !== sum.substitutions) {
        out.push(
          issue(
            subs > sum.substitutions ? "error" : "warning",
            "subs-count",
            `Set ${set.number}, equipo ${s}: ${subs} sustituciones leídas y ${sum.substitutions} en el resultado.`
          )
        );
      }
      // Un dorsal repetido en la alineación es un error de lectura; los que faltan, un acta incompleta (ya avisado)
      const typed = side.lineup.filter((n) => n !== 0);
      if (new Set(typed).size !== typed.length) {
        out.push(issue("error", "lineup", `Set ${set.number}, equipo ${s}: alineación inicial ${side.lineup.join(", ")} con dorsales repetidos.`));
      }
      const roster = new Set(data.roster[s].map((p) => p.number));
      for (const n of side.lineup) {
        if (n && roster.size > 0 && !roster.has(n)) out.push(issue("warning", "lineup-roster", `Set ${set.number}, equipo ${s}: el ${n} de la alineación no está en la plantilla.`));
      }
      for (const sub of side.substitutions) {
        if (sub.playerIn !== null && roster.size > 0 && !roster.has(sub.playerIn)) {
          out.push(issue("warning", "sub-roster", `Set ${set.number}, equipo ${s}: entra el ${sub.playerIn}, que no está en la plantilla.`));
        }
      }
    }

    // Los marcadores de tiempos muertos y sustituciones no pueden pasarse de los puntos finales del set
    // (si la lectura confundiera «propios:rival» con «rival:propios», esto saltaría casi siempre).
    // Un set con un equipo a cero y jugadas anotadas en el panel es un set otorgado por el comité: el
    // panel es el juego real y el resultado, el administrativo, así que no se contrastan.
    const hasEvents = sides.some((x) => set[x].timeouts.length + set[x].substitutions.length > 0);
    const awarded = Math.min(a, b) === 0 && hasEvents;
    if (awarded) {
      out.push(issue("warning", "set-awarded", `Set ${set.number}: resultado ${a}-${b} con jugadas anotadas en el panel (¿set otorgado por el comité?).`));
    }
    for (const s of awarded ? [] : sides) {
      const own = set.summary[s].points;
      const opp = set.summary[s === "A" ? "B" : "A"].points;
      const events = [
        ...set[s].timeouts.map((t) => ({ what: "tiempo muerto", sc: t.score })),
        ...set[s].substitutions.flatMap((x) => [
          { what: "sustitución", sc: x.scoreIn },
          ...(x.scoreBack ? [{ what: "vuelta del titular", sc: x.scoreBack }] : []),
        ]),
      ];
      for (const e of events) {
        if (e.sc.own > own || e.sc.opp > opp) {
          out.push(issue("error", "score-range", `Set ${set.number}, equipo ${s}: ${e.what} en ${e.sc.own}:${e.sc.opp} con un final de ${own}-${opp}.`));
        }
      }
    }

    // Duración del set contra sus horas de inicio y fin
    const real = minutesBetween(set.start, set.end);
    if (real !== null && set.durationMin !== null && Math.abs(real - set.durationMin) > 1) {
      out.push(issue("warning", "set-duration", `Set ${set.number}: dura ${set.durationMin}' pero va de ${set.start} a ${set.end}.`));
    }
  }

  // Totales contra la suma de los sets
  for (const s of sides) {
    if (data.totals[s].points !== points[s]) {
      out.push(issue("warning", "total-points", `Equipo ${s}: ${data.totals[s].points} puntos en el total y ${points[s]} sumando los sets.`));
    }
    const timeouts = data.sets.reduce((acc, set) => acc + set.summary[s].timeouts, 0);
    if (data.totals[s].timeouts !== timeouts) {
      out.push(issue("warning", "total-timeouts", `Equipo ${s}: ${data.totals[s].timeouts} tiempos muertos en el total y ${timeouts} sumando los sets.`));
    }
  }

  if (data.winner) {
    const w = (won.A > won.B ? data.teams.A : data.teams.B) as string;
    if (normalizeTeam(w) !== normalizeTeam(data.winner.team)) {
      out.push(issue("warning", "winner", `El ganador del acta (${data.winner.team}) no es quien gana más sets (${w}).`));
    }
    if (data.winner.setsWinner !== Math.max(won.A, won.B) || data.winner.setsLoser !== Math.min(won.A, won.B)) {
      out.push(issue("warning", "winner-score", `El marcador del ganador (${data.winner.setsWinner}-${data.winner.setsLoser}) no es el de los sets.`));
    }
  } else if (data.sets.length > 0) {
    out.push(issue("warning", "no-winner", "El acta no indica ganador."));
  }

  // Duración total contra las horas de inicio y fin del partido
  const matchMin = minutesBetween(data.totals.start, data.totals.end);
  if (matchMin !== null && data.totals.durationMin !== null && Math.abs(matchMin - data.totals.durationMin) > 1) {
    out.push(issue("warning", "match-duration", `El partido dura ${data.totals.durationMin}' pero va de ${data.totals.start} a ${data.totals.end}.`));
  }

  // Plantillas
  for (const s of sides) {
    const nums = data.roster[s].map((p) => p.number);
    if (new Set(nums).size !== nums.length) out.push(issue("error", "roster-duplicate", `Equipo ${s}: dorsales repetidos en la plantilla.`));
    if (nums.length === 0) out.push(issue("warning", "roster-empty", `Equipo ${s}: el acta no trae la plantilla.`));
  }

  return out;
}

// ─── Contra la federación ──────────────────────────────────────

export type FedMatchForActa = {
  homeName: string;
  awayName: string;
  homeSets: number | null;
  awaySets: number | null;
  /** Puntos de cada set por orden: (local, visitante). */
  sets: { home: number; away: number }[];
};

export type FedComparison = {
  /** Qué equipo del acta (A o B) es el local de la federación; null si no se puede decir. */
  homeSide: Side | null;
  issues: ActaIssue[];
};

/** Contrasta el acta con el partido de la federación: equipos, sets ganados y puntos de cada set. */
export function compareWithFed(data: ActaData, fed: FedMatchForActa): FedComparison {
  const issues: ActaIssue[] = [];
  const nA = normalizeTeam(data.teams.A);
  const nB = normalizeTeam(data.teams.B);
  const nHome = normalizeTeam(fed.homeName);
  const nAway = normalizeTeam(fed.awayName);

  let homeSide: Side | null = null;
  if (nA === nHome && nB === nAway) homeSide = "A";
  else if (nB === nHome && nA === nAway) homeSide = "B";

  // Los puntos de cada set deciden cuando los nombres no coinciden
  const matches = (home: Side): boolean =>
    fed.sets.length === data.sets.length &&
    fed.sets.every((s, i) => {
      const set = data.sets[i];
      const away: Side = home === "A" ? "B" : "A";
      return set.summary[home].points === s.home && set.summary[away].points === s.away;
    });
  const byPoints: Side | null = fed.sets.length > 0 ? (matches("A") ? "A" : matches("B") ? "B" : null) : null;

  if (homeSide === null) homeSide = byPoints;
  else if (byPoints !== null && byPoints !== homeSide) {
    issues.push(issue("error", "fed-sides", "Los nombres de los equipos y los puntos de los sets apuntan a locales distintos."));
  }

  if (homeSide === null) {
    issues.push(issue("error", "fed-mismatch", "El acta no coincide con el partido de la federación (equipos ni puntos de los sets)."));
    return { homeSide, issues };
  }

  const away: Side = homeSide === "A" ? "B" : "A";
  if (fed.sets.length !== data.sets.length) {
    issues.push(issue("error", "fed-set-count", `El acta tiene ${data.sets.length} sets y la federación ${fed.sets.length}.`));
  } else {
    fed.sets.forEach((s, i) => {
      const set = data.sets[i];
      if (set.summary[homeSide].points !== s.home || set.summary[away].points !== s.away) {
        issues.push(issue("error", "fed-set-points", `Set ${set.number}: ${set.summary[homeSide].points}-${set.summary[away].points} en el acta y ${s.home}-${s.away} en la federación.`));
      }
    });
  }
  // Con los mismos puntos en todos los sets, que el resultado final difiera apunta a una decisión del
  // comité (sanción, set otorgado): el acta está bien leída, pero se deja constancia.
  const samePoints = !issues.some((i) => i.code === "fed-set-points" || i.code === "fed-set-count");
  const level = samePoints ? "warning" : "error";
  if (fed.homeSets !== null && data.totals[homeSide].setsWon !== fed.homeSets) {
    issues.push(issue(level, "fed-sets-won", `Sets del local: ${data.totals[homeSide].setsWon} en el acta y ${fed.homeSets} en la federación.`));
  }
  if (fed.awaySets !== null && data.totals[away].setsWon !== fed.awaySets) {
    issues.push(issue(level, "fed-sets-won", `Sets del visitante: ${data.totals[away].setsWon} en el acta y ${fed.awaySets} en la federación.`));
  }
  return { homeSide, issues };
}

/** Estado con el que se guarda un acta según sus avisos. */
export function actaStatus(issues: ActaIssue[]): "ok" | "review" | "failed" {
  if (issues.some((i) => i.level === "error")) return "failed";
  if (issues.length > 0) return "review";
  return "ok";
}
