import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { FedTournamentBundle } from "@/lib/fed/parse";
import fixture from "@/lib/stats/competitive/__fixtures__/liga-masculina-2024-27.json";
import { buildCompetitiveStats } from "@/lib/stats/competitive/build";
import { seasonDataFromBundles } from "@/lib/stats/competitive/fromBundles";
import { FormPanel, NextMatchPanel, PositionPanel, TopRivalPanel } from "./NextMatchPanel";
import LeaguePanel from "./LeaguePanel";
import RivalsPanel from "./RivalsPanel";
import TeamCardPanel from "./TeamCardPanel";
import VersusPanel from "./VersusPanel";
import { newlyUnlocked } from "@/lib/stats/competitive/achievementsSeen";

const bundles = fixture as unknown as FedTournamentBundle[];
const stats = (season: string, prev: string, today: string) =>
  buildCompetitiveStats({
    current: seasonDataFromBundles(bundles, season, "male"),
    previous: seasonDataFromBundles(bundles, prev, "male"),
    today,
  });

const full = stats("2025-26", "2024-25", "2026-05-30");
const start = stats("2026-27", "2025-26", "2026-10-16");
const noop = () => {};

const html = (node: React.ReactElement) => renderToStaticMarkup(node);
const clean = (markup: string) => {
  expect(markup).not.toMatch(/undefined|NaN|\[object/);
  return markup;
};

describe("ficha del equipo", () => {
  it("temporada completa: valoración, puesto, récord y atributos", () => {
    const out = clean(html(<TeamCardPanel stats={full} />));
    expect(out).toContain("CD Voleypuerto");
    expect(out).toContain("5.º de 12");
    expect(out).toContain("34 pts · 10V 12D");
    for (const label of ["Ataque", "Defensa", "Cierre", "Remontada", "Casa", "Viaje"]) expect(out).toContain(label);
    expect(out).toContain("Cómo sale cada número");
  });

  it("arranque de temporada: enseña la ficha del año pasado y cuántos partidos faltan", () => {
    const out = clean(html(<TeamCardPanel stats={start} />));
    expect(out).toContain("Ficha de 2025-26");
    expect(out).toContain("se desbloquea tras 4 partidos");
    expect(out).toContain("dashed");
  });

  it("sin liga todavía, avisa en vez de romperse", () => {
    const sinLiga = buildCompetitiveStats({
      current: { season: "2027-28", gender: "male", groups: [], teams: [], matches: [] },
      previous: null,
      today: "2027-10-01",
    });
    expect(clean(html(<TeamCardPanel stats={sinLiga} />))).toContain("Todavía no hay una liga");
  });
});

describe("clasificación en resumen", () => {
  it("muestra puesto, puntos y enlace a la tabla", () => {
    const out = clean(html(<PositionPanel stats={full} onOpenLeague={noop} />));
    expect(out).toContain("Clasificación");
    expect(out).toContain("5.º");
    expect(out).toContain("de 12");
    expect(out).toContain("34 pts · 10V 12D");
    expect(out).toContain("Ver tabla completa");
  });

  it("arranque sin partidos jugados: avisa en vez de inventar puesto", () => {
    const out = clean(html(<PositionPanel stats={start} onOpenLeague={noop} />));
    expect(out).toContain("Sin partidos aún");
  });
});

describe("próximo partido, forma y rival a batir", () => {
  it("arranque: rival sin referencia explica por qué no hay probabilidad", () => {
    const out = clean(html(<NextMatchPanel stats={start} onOpenRival={noop} />));
    expect(out).toContain("La Palma Volleyball");
    expect(out).toContain("en casa");
    expect(out).toContain("rival sin referencia");
  });

  it("forma: sin partidos jugados recuerda el año pasado", () => {
    expect(clean(html(<FormPanel stats={start} />))).toContain("El año pasado: 10V y 12D");
  });

  it("forma: con partidos, píldoras V/D y racha", () => {
    const out = clean(html(<FormPanel stats={full} />));
    expect(out).toContain("Racha actual");
    expect(out).toMatch(/>V<|>D</);
  });

  it("rival a batir con su motivo", () => {
    const out = clean(html(<TopRivalPanel stats={full} onOpenRival={noop} />));
    expect(out).toContain("Rival a batir");
    expect(out).toContain(full.rivals[0].reason);
  });
});

describe("rivales", () => {
  it("lista con dossier, etiquetas y cara a cara real", () => {
    const out = clean(html(<RivalsPanel stats={full} selectedId={null} onSelect={noop} />));
    expect(out).toContain("Rivales a batir");
    expect(out).toContain("Cuenta pendiente");
    expect(out).toContain("A batir");
    expect(out).toContain("Cara a cara");
    expect(out).toContain("Cómo se calcula");
    expect(out).toContain("Probabilidad de ganar");
    expect(out).toContain("Nos ganó 3-0 el 07/02");
    expect(out).not.toMatch(/rating/i);
  });

  it("rival expandido en móvil muestra su dossier", () => {
    const meet = full.rivals.find((r) => r.name === "MEET MUSIC TOURISM")!;
    const out = clean(html(<RivalsPanel stats={full} selectedId={meet.teamId} onSelect={noop} />));
    expect(out).toContain("aria-expanded=\"true\"");
    expect(out).toContain("7 feb 2026");
  });

  it("arranque: rivales nuevos salen limpios, sin rating ni probabilidad inventados", () => {
    const out = clean(html(<RivalsPanel stats={start} selectedId={null} onSelect={noop} />));
    expect(out).toContain("Rival nuevo");
    expect(out).toContain("Sin datos");
    expect(out).not.toMatch(/rating|NaN/i);
  });
});

describe("liga", () => {
  it("clasificación completa con nuestra fila y la carrera de posiciones", () => {
    const out = clean(html(<LeaguePanel stats={full} />));
    expect(out).toContain("Liga Oro · 12 equipos");
    expect(out.indexOf("CDV San Roque")).toBeLessThan(out.indexOf("CD Voleypuerto"));
    expect(out).toContain("63"); // puntos del líder
    expect(out).not.toMatch(/rating|1500/i); // sin jerga de Elo en la tabla
    expect(out).toContain("Carrera de posiciones");
    expect(out).toMatch(/ahora 5\.º; mejor puesto \d\.º/);
  });

  it("arranque: sin partidos avisa en lugar de dibujar un gráfico vacío", () => {
    const out = clean(html(<LeaguePanel stats={start} />));
    expect(out).toContain("todavía sin partidos jugados");
    expect(out).toContain("Aparece cuando se juegue la primera jornada");
  });
});

describe("vs. año pasado", () => {
  it("compara el mismo punto, los récords y los logros", () => {
    const out = clean(html(<VersusPanel stats={full} />));
    expect(out).toContain("Con 22 partidos de liga jugados");
    expect(out).toContain("15 puntos más que el año pasado");
    expect(out).toContain("Objetivo superado");
    expect(out).toContain("Mejor racha de victorias");
    expect(out).toContain("Desbloqueados · 9");
    expect(out).toContain("Por conseguir · 6");
    expect(out).toContain("Venganza");
    expect(out).toContain("todas las competiciones");
  });

  it("arranque: se activa con el primer partido y recuerda cómo acabó el año pasado", () => {
    const out = clean(html(<VersusPanel stats={start} />));
    expect(out).toContain("Se activa con el primer partido de liga");
    expect(out).toContain("acabamos 5.º con 34 puntos");
  });

  it("sin temporada anterior no inventa comparativas", () => {
    const sola = buildCompetitiveStats({
      current: seasonDataFromBundles(bundles, "2024-25", "male"),
      previous: null,
      today: "2025-06-01",
    });
    const out = clean(html(<VersusPanel stats={sola} />));
    expect(out).toContain("No hay datos de la temporada anterior");
  });
});

describe("logros nuevos", () => {
  it("la primera visita no marca nada; después, solo lo desbloqueado desde entonces", () => {
    expect(newlyUnlocked(["a", "b"], null)).toEqual([]);
    expect(newlyUnlocked(["a", "b", "c"], ["a", "b"])).toEqual(["c"]);
    expect(newlyUnlocked(["a"], ["a"])).toEqual([]);
  });
});
