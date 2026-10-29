import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { FedTournamentBundle } from "@/lib/fed/parse";
import fixture from "@/lib/stats/competitive/__fixtures__/liga-masculina-2024-27.json";
import { buildCompetition, type CompetitionInput, type CompetitionMatch } from "@/lib/competition/build";
import { scoutMatch } from "@/lib/competition/scout";
import MatchScoutPanel from "./MatchScoutPanel";
import RoundMatches from "./RoundMatches";
import GroupStandings from "./GroupStandings";
import MatchDetailView from "@/app/(protected)/jornadas/partido/[id]/MatchDetailView";

/** Temporada completa real (2025-26 masculina) → misma forma que lee el cargador. */
function inputFrom(bundles: FedTournamentBundle[], season: string): CompetitionInput {
  const mine = bundles.filter((b) => b.tournament.season === season);
  const facilities = new Map(mine.flatMap((b) => b.facilities.map((f) => [f.id, f.name] as const)));
  return {
    season,
    gender: "male",
    groups: mine.flatMap((b) =>
      b.groups
        .filter((g) => g.gender === "male")
        .map((g) => ({ id: g.id, name: g.name, type: g.type, sort_order: g.sort_order }))
    ),
    rounds: mine.flatMap((b) => b.rounds),
    teams: mine.flatMap((b) =>
      b.teams.map((t) => ({ id: t.id, name: t.name, club_id: t.club_id, is_our_club: t.is_our_club }))
    ),
    matches: mine.flatMap((b) =>
      b.matches.map((m) => ({
        ...m,
        facility_name: m.facility_id !== null ? facilities.get(m.facility_id) ?? null : null,
        sets: b.sets.filter((s) => s.match_id === m.id),
      }))
    ),
  };
}

const comp = buildCompetition(inputFrom(fixture as unknown as FedTournamentBundle[], "2025-26"), "2026-05-30");
const group = comp.groups.find((g) => g.hasOurs && g.standings)!;
const all: CompetitionMatch[] = group.rounds.flatMap((r) => r.matches);
const playedMatches = all.filter((m) => m.status === "played");

const clean = (markup: string) => {
  expect(markup).not.toMatch(/undefined|NaN|\[object|Infinity/);
  return markup;
};

describe("jornadas con una temporada real completa", () => {
  it("hay grupo de liga con clasificación y partidos jugados", () => {
    expect(group).toBeDefined();
    expect(playedMatches.length).toBeGreaterThan(50);
  });

  it("la clasificación se pinta con nuestros equipos resaltados", () => {
    const out = clean(renderToStaticMarkup(<GroupStandings groupName={group.name} standings={group.standings!} teams={comp.teams} />));
    expect(out).toContain("<table");
    expect(out).toContain("accent-muted");
  });

  it("una jornada entera se pinta con resultados y sets", () => {
    const round = group.rounds.find((r) => r.matches.some((m) => m.status === "played"))!;
    const out = clean(
      renderToStaticMarkup(<RoundMatches matches={round.matches} teams={comp.teams} />)
    );
    // Marcador por equipo: sets ganados en negrita para el que gana, y los puntos de cada set
    expect(out).toMatch(/font-bold[^>]*>3</);
    expect(out).toMatch(/\d{1,2}<\/span><span class="w-5 text-right/);
    // Cada partido abre su detalle
    expect(out).toContain("/jornadas/partido/");
    expect(out).toMatch(/<h3[^>]*>(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo) \d+ de /);
  });

  it("el panel de scout de cualquier partido jugado no produce NaN ni undefined", () => {
    for (const m of playedMatches) {
      const scout = scoutMatch(all, m.homeId!, m.awayId!);
      clean(renderToStaticMarkup(<MatchScoutPanel scout={scout} homeId={m.homeId!} awayId={m.awayId!} teams={comp.teams} />));
    }
  });

  it("el scout con datos muestra veredicto, comparativa y rivales comunes", () => {
    // Un partido de la segunda vuelta: ya hay duelo directo y rivales comunes
    const late = [...playedMatches].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))[0];
    const scout = scoutMatch(all, late.homeId!, late.awayId!);
    const out = clean(
      renderToStaticMarkup(<MatchScoutPanel scout={scout} homeId={late.homeId!} awayId={late.awayId!} teams={comp.teams} />)
    );
    expect(out).toMatch(/Favorito|Sin favorito claro/);
    expect(out).toContain("Ganados / jugados");
    expect(out).toContain("Rivales comunes");
    expect(scout.common.length).toBeGreaterThan(0);
  });

  it("sin partidos jugados avisa en vez de enseñar una tabla vacía", () => {
    const ids = comp.groups[0].teamIds;
    const scout = scoutMatch([], ids[0], ids[1]);
    const out = renderToStaticMarkup(<MatchScoutPanel scout={scout} homeId={ids[0]} awayId={ids[1]} teams={comp.teams} />);
    expect(out).toContain("Todavía no hay partidos jugados");
    expect(out).not.toContain("Ganados / jugados");
  });
});

describe("detalle de un partido", () => {
  const props = (m: CompetitionMatch, ours: { id: string; video_url: string | null; notes: string | null } | null, isAdmin: boolean) => ({
    match: m,
    teams: comp.teams,
    groupMatches: all,
    groupName: group.name,
    roundLabel: "12",
    backHref: "/jornadas?season=2025-26",
    ours,
    isAdmin,
  });

  it("un partido jugado abre en el resumen con sus sets, el enlace de vuelta y el PDF", () => {
    const m = playedMatches.find((x) => x.sets.length >= 3 && x.reportUrl)!;
    const out = clean(renderToStaticMarkup(<MatchDetailView {...props(m, null, false)} />));
    expect(out).toContain("Puntos de cada set");
    expect(out).toContain("Total de puntos");
    expect(out).toContain("Jornada 12");
    expect(out).toContain('href="/jornadas?season=2025-26"');
    expect(out).toContain(`/api/fed/report/${m.id}`);
    expect(out).not.toContain("Editar partido");
  });

  it("si es nuestro y eres admin ofrece editarlo, y enseña notas y vídeo", () => {
    const m = playedMatches.find((x) => x.ours)!;
    const out = clean(
      renderToStaticMarkup(<MatchDetailView {...props(m, { id: "abc", video_url: "https://youtube.com/watch?v=1", notes: "Ojo al saque" }, true)} />)
    );
    expect(out).toContain('href="/matches/abc?edit=1"');
    expect(out).toContain("Ojo al saque");
    expect(out).toContain("Vídeo");
  });

  it("un partido por jugar abre directamente en el scout", () => {
    const base = playedMatches[0];
    const pending = { ...base, status: "scheduled" as const, homeSets: null, awaySets: null, sets: [] };
    const out = clean(renderToStaticMarkup(<MatchDetailView {...props(pending, null, false)} />));
    expect(out).toContain("Ganados / jugados");
    expect(out).not.toContain("Total de puntos");
  });
});
