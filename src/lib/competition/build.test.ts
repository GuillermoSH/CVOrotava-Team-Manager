import { describe, expect, it } from "vitest";
import {
  buildCompetition,
  groupLabel,
  matchStatus,
  pickCurrentRound,
  roundTitle,
  type CompetitionInput,
} from "./build";

type M = CompetitionInput["matches"][number];

const match = (over: Partial<M> & Pick<M, "id" | "group_id">): M => ({
  round_id: null,
  home_team_id: null,
  away_team_id: null,
  facility_name: null,
  local_date: null,
  local_time: null,
  finished: false,
  canceled: false,
  postponed: false,
  rest: false,
  home_sets: null,
  away_sets: null,
  home_league_points: null,
  away_league_points: null,
  report_url: null,
  sets: [],
  ...over,
});

const teams = [
  { id: 1, name: "CV OROTAVA", club_id: 10, is_our_club: true },
  { id: 2, name: "CV A", club_id: 20, is_our_club: false },
  { id: 3, name: "CV B", club_id: 30, is_our_club: false },
  { id: 4, name: "CV C", club_id: 40, is_our_club: false },
];

const base: Omit<CompetitionInput, "groups" | "rounds" | "matches"> = {
  season: "2026-27",
  gender: "male",
  teams,
};

describe("matchStatus", () => {
  it("distingue jugado, pendiente, aplazado, suspendido y descanso", () => {
    expect(matchStatus(match({ id: 1, group_id: 1, finished: true, home_sets: 3, away_sets: 1 }))).toBe("played");
    expect(matchStatus(match({ id: 1, group_id: 1 }))).toBe("scheduled");
    expect(matchStatus(match({ id: 1, group_id: 1, postponed: true }))).toBe("postponed");
    expect(matchStatus(match({ id: 1, group_id: 1, canceled: true }))).toBe("canceled");
    expect(matchStatus(match({ id: 1, group_id: 1, rest: true }))).toBe("rest");
  });

  it("un partido terminado sin marcador no cuenta como jugado", () => {
    expect(matchStatus(match({ id: 1, group_id: 1, finished: true }))).toBe("scheduled");
  });
});

describe("buildCompetition", () => {
  const input: CompetitionInput = {
    ...base,
    groups: [
      { id: 20, name: "GRUPO LAS PALMAS", type: "league", sort_order: 2 },
      { id: 10, name: "GRUPO TENERIFE", type: "league", sort_order: 1 },
      { id: 30, name: "FASE FINAL", type: "play_off", sort_order: 3 },
    ],
    rounds: [
      { id: 102, group_id: 10, name: "Jornada 2", sort_order: 2 },
      { id: 101, group_id: 10, name: "Jornada 1", sort_order: 1 },
      { id: 201, group_id: 20, name: "Jornada 1", sort_order: 1 },
    ],
    matches: [
      match({
        id: 1,
        group_id: 10,
        round_id: 101,
        home_team_id: 1,
        away_team_id: 2,
        local_date: "2026-10-24",
        local_time: "16:30:00",
        finished: true,
        home_sets: 3,
        away_sets: 1,
        sets: [
          { set_number: 2, home_points: 20, away_points: 25 },
          { set_number: 1, home_points: 25, away_points: 18 },
        ],
      }),
      match({ id: 2, group_id: 10, round_id: 101, home_team_id: 3, away_team_id: 4, local_date: "2026-10-24", local_time: "12:00:00" }),
      match({ id: 3, group_id: 10, round_id: 102, home_team_id: 2, away_team_id: 1, local_date: "2026-11-07", local_time: "18:00:00", facility_name: "Quiquirá" }),
      match({ id: 4, group_id: 20, round_id: 201, home_team_id: 3, away_team_id: 4, local_date: "2026-10-25" }),
      match({ id: 5, group_id: 30, home_team_id: 1, away_team_id: 3, local_date: "2027-04-10" }),
    ],
  };

  const comp = buildCompetition(input, "2026-10-30");

  it("ordena los grupos por su orden y no asume cuántos hay", () => {
    expect(comp.groups.map((g) => g.name)).toEqual(["GRUPO TENERIFE", "GRUPO LAS PALMAS", "FASE FINAL"]);
  });

  it("ordena las jornadas y numera dentro de cada grupo", () => {
    const tf = comp.groups[0];
    expect(tf.rounds.map((r) => [r.index, r.label])).toEqual([
      [1, "Jornada 1"],
      [2, "Jornada 2"],
    ]);
    expect(tf.rounds[0].startDate).toBe("2026-10-24");
    expect(tf.rounds[1].endDate).toBe("2026-11-07");
  });

  it("ordena los partidos por fecha y hora, con la hora sin segundos", () => {
    const [first, second] = comp.groups[0].rounds[0].matches;
    expect([first.id, first.time]).toEqual([2, "12:00"]);
    expect([second.id, second.time]).toEqual([1, "16:30"]);
  });

  it("ordena los sets y marca los partidos nuestros", () => {
    const played = comp.groups[0].rounds[0].matches.find((m) => m.id === 1)!;
    expect(played.sets).toEqual([
      { home: 25, away: 18 },
      { home: 20, away: 25 },
    ]);
    expect(played.ours).toBe(true);
    expect(comp.groups[0].rounds[0].matches.find((m) => m.id === 2)!.ours).toBe(false);
    expect(comp.groups[1].hasOurs).toBe(false);
    expect(comp.groups[0].hasOurs).toBe(true);
  });

  it("calcula clasificación solo en grupos de liga", () => {
    const tf = comp.groups[0];
    expect(tf.standings?.[0].teamId).toBe(1);
    expect(tf.standings?.[0].league_points).toBe(3);
    expect(tf.standings?.find((s) => s.teamId === 2)?.played).toBe(1);
    expect(comp.groups[2].standings).toBeNull();
  });

  it("agrupa en «Sin jornada» los partidos sin jornada", () => {
    const fin = comp.groups[2];
    expect(fin.rounds).toHaveLength(1);
    expect(fin.rounds[0]).toMatchObject({ id: null, index: 0, label: "Sin jornada" });
  });

  it("abre la jornada de la próxima fecha pendiente", () => {
    expect(comp.groups[0].currentRound).toBe(1);
  });

  it("indexa los equipos por id", () => {
    expect(comp.teams[1]).toMatchObject({ name: "CV OROTAVA", isOurs: true });
  });

  it("funciona con un solo grupo y sin jornadas definidas", () => {
    const one = buildCompetition(
      {
        ...base,
        gender: "female",
        groups: [{ id: 1, name: "REGIONAL", type: "league", sort_order: null }],
        rounds: [],
        matches: [match({ id: 9, group_id: 1, home_team_id: 1, away_team_id: 2, local_date: "2026-11-01" })],
      },
      "2026-10-30"
    );
    expect(one.groups).toHaveLength(1);
    expect(one.groups[0].rounds[0].label).toBe("Sin jornada");
  });

  it("no revienta si no hay datos", () => {
    const empty = buildCompetition({ ...base, groups: [], rounds: [], matches: [] }, "2026-10-30");
    expect(empty.groups).toEqual([]);
  });
});

describe("pickCurrentRound", () => {
  const round = (index: number, matches: { status: "played" | "scheduled"; date: string }[]) => ({
    id: index,
    index,
    label: `J${index}`,
    startDate: null,
    endDate: null,
    matches: matches.map((m, i) => ({
      id: index * 10 + i,
      homeId: 1,
      awayId: 2,
      date: m.date,
      time: null,
      venue: null,
      status: m.status,
      homeSets: null,
      awaySets: null,
      sets: [],
      reportUrl: null,
      ours: false,
    })),
  });

  it("si ya terminó todo, enseña la última jornada jugada", () => {
    const rounds = [round(1, [{ status: "played", date: "2026-10-01" }]), round(2, [{ status: "played", date: "2026-10-08" }])];
    expect(pickCurrentRound(rounds, "2026-12-01")).toBe(1);
  });

  it("si no ha empezado nada, enseña la primera", () => {
    expect(pickCurrentRound([round(1, [{ status: "scheduled", date: "2027-01-01" }])], "2026-09-01")).toBe(0);
  });

  it("ignora pendientes con fecha ya pasada y busca la siguiente futura", () => {
    const rounds = [
      round(1, [{ status: "played", date: "2026-10-01" }]),
      round(2, [{ status: "scheduled", date: "2026-10-05" }]),
      round(3, [{ status: "scheduled", date: "2026-11-01" }]),
    ];
    expect(pickCurrentRound(rounds, "2026-10-20")).toBe(2);
  });
});

describe("roundTitle", () => {
  it("la federación da solo el número: se enseña como «Jornada N»", () => {
    expect(roundTitle("2")).toBe("Jornada 2");
    expect(roundTitle(" 12 ")).toBe("Jornada 12");
  });

  it("deja tal cual los nombres que ya son texto", () => {
    expect(roundTitle("Cuartos de final")).toBe("Cuartos de final");
    expect(roundTitle("Jornada 3")).toBe("Jornada 3");
  });
});

describe("groupLabel", () => {
  it("pasa los grupos en mayúsculas a título, sin perder «Las»", () => {
    expect(groupLabel("GRUPO LAS PALMAS")).toBe("Grupo Las Palmas");
    expect(groupLabel("GRUPO TENERIFE")).toBe("Grupo Tenerife");
    expect(groupLabel("FASE FINAL")).toBe("Fase Final");
  });

  it("mantiene en minúscula «de» y «del», y limpia espacios", () => {
    expect(groupLabel("  Fase  de ASCENSO ")).toBe("Fase de Ascenso");
    expect(groupLabel("COPA DEL GOBIERNO")).toBe("Copa del Gobierno");
  });
});
