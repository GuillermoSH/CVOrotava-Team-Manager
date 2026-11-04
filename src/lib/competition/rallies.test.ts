import { describe, expect, it } from "vitest";
import { parseRallies } from "./report";
import { afterTimeout, indexOfScore, setFlow } from "./rallies";

describe("parseRallies", () => {
  it("lee quién saca primero y quién gana cada jugada", () => {
    expect(parseRallies("L:LVV")).toEqual({ first: "home", winners: ["home", "away", "away"] });
    expect(parseRallies("V:L")).toEqual({ first: "away", winners: ["home"] });
  });
  it("lo que no tiene el formato da null", () => {
    expect(parseRallies(null)).toBeNull();
    expect(parseRallies("LVV")).toBeNull();
    expect(parseRallies("X:LV")).toBeNull();
    expect(parseRallies("L:")).toBeNull();
  });
});

describe("setFlow", () => {
  // Local saca primero: L gana (saque), L gana (saque), V gana al recibir, V gana (ya saca V), L gana al recibir, L gana
  const r = parseRallies("L:LLVVLL")!;
  const f = setFlow(r, "home", 1);

  it("marcador tras cada jugada visto desde el equipo", () => {
    expect(f.scores.map((s) => `${s.own}-${s.opp}`)).toEqual(["0-0", "1-0", "2-0", "2-1", "2-2", "3-2", "4-2"]);
    expect(f.won).toBe(true);
  });

  it("rachas, ventajas y cambios de líder", () => {
    expect(f.runFor).toEqual({ length: 2, from: { own: 0, opp: 0 }, to: { own: 2, opp: 0 } });
    expect(f.runAgainst).toEqual({ length: 2, from: { own: 2, opp: 0 }, to: { own: 2, opp: 2 } });
    expect(f.maxLead).toBe(2);
    expect(f.maxDeficit).toBe(0);
    // Va por delante, empata y vuelve a ir por delante: no hay cambio de líder
    expect(f.leadChanges).toBe(0);
    expect(setFlow(parseRallies("V:VLLL")!, "home", 1).leadChanges).toBe(1);
  });

  it("jugadas al saque y al recibir", () => {
    // Saca L en la 1.ª y en la 2.ª (gana L) y en la 5.ª (gana L: sacaba V que ganó la 4.ª...). Servidor = ganador de la jugada anterior
    // Servidores: L, L, L, V, V, L → mias (home): 1.ª,2.ª,3.ª y 6.ª; ganó 1.ª, 2.ª y 6.ª
    expect(f.serve).toEqual({ won: 3, of: 4 });
    expect(f.receive).toEqual({ won: 1, of: 2 });
  });

  it("visto desde el rival cambia todo", () => {
    const g = setFlow(r, "away", 1);
    expect(g.won).toBe(false);
    expect(g.maxDeficit).toBe(2);
    expect(g.scores[2]).toEqual({ own: 0, opp: 2 });
    expect(g.serve.of + g.receive.of).toBe(6);
  });

  it("un final apretado es llegar los dos equipos a 20 (o a 10 en el quinto)", () => {
    const tie = (n: number) => "L:" + "LV".repeat(n);
    expect(setFlow(parseRallies(tie(20))!, "home", 1).closeFinish).toBe(true);
    expect(setFlow(parseRallies(tie(19))!, "home", 1).closeFinish).toBe(false);
    expect(setFlow(parseRallies(tie(10))!, "home", 5).closeFinish).toBe(true);
  });
});

describe("tiempo muerto dentro del set", () => {
  const r = parseRallies("L:LVVVLL")!; // 1-0, 1-1, 1-2, 1-3, 2-3, 3-3
  const f = setFlow(r, "home", 1);

  it("localiza el marcador y dice qué pasa justo después", () => {
    expect(indexOfScore(f, { own: 1, opp: 3 })).toBe(4);
    // El local pide tiempo con 1-3 tras tres seguidas del rival y gana la siguiente
    expect(afterTimeout(r, "home", f, { own: 1, opp: 3 })).toEqual({ nextWon: true, rivalRun: 3 });
    // El visitante pide con 2-3 (visto desde él, 3:2); la siguiente la gana el local
    const fa = setFlow(r, "away", 1);
    expect(afterTimeout(r, "away", fa, { own: 3, opp: 2 })).toEqual({ nextWon: false, rivalRun: 1 });
  });

  it("un marcador que no está en el desarrollo del set se ignora", () => {
    expect(indexOfScore(f, { own: 5, opp: 0 })).toBeNull();
    expect(afterTimeout(r, "home", f, { own: 0, opp: 2 })).toBeNull();
  });
});
