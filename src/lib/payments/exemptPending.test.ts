import { describe, expect, it } from "vitest";
import { exemptWithPending } from "./exemptPending";

const ana = { id: "p-ana", full_name: "Ana Pérez", user_id: "u-ana" };
const beto = { id: "p-beto", full_name: "Beto Gil", user_id: "u-beto" };
const sinCuenta = { id: "p-sc", full_name: "Sin Cuenta", user_id: null };

describe("exemptWithPending", () => {
  it("cuenta los pendientes que cuelgan del player_id", () => {
    const out = exemptWithPending([ana], [
      { player_id: "p-ana", user_id: "u-ana" },
      { player_id: "p-ana", user_id: null },
      { player_id: "p-otro", user_id: "u-otro" },
    ]);
    expect(out).toEqual([{ playerId: "p-ana", name: "Ana Pérez", count: 2 }]);
  });

  it("incluye los antiguos que solo llevan el user_id", () => {
    const out = exemptWithPending([ana], [{ player_id: null, user_id: "u-ana" }]);
    expect(out).toEqual([{ playerId: "p-ana", name: "Ana Pérez", count: 1 }]);
  });

  it("no atribuye a un exento los pagos con player_id de otro jugador aunque compartan user_id", () => {
    const out = exemptWithPending([ana], [{ player_id: "p-otro", user_id: "u-ana" }]);
    expect(out).toEqual([]);
  });

  it("un exento sin cuenta solo cuenta por player_id y nunca por user_id vacío", () => {
    const out = exemptWithPending([sinCuenta], [
      { player_id: null, user_id: null },
      { player_id: "p-sc", user_id: null },
    ]);
    expect(out).toEqual([{ playerId: "p-sc", name: "Sin Cuenta", count: 1 }]);
  });

  it("omite a los exentos sin pendientes y ordena por cantidad y luego por nombre", () => {
    const out = exemptWithPending([beto, ana, sinCuenta], [
      { player_id: "p-ana", user_id: null },
      { player_id: "p-beto", user_id: null },
      { player_id: "p-beto", user_id: null },
    ]);
    expect(out.map((x) => [x.name, x.count])).toEqual([
      ["Beto Gil", 2],
      ["Ana Pérez", 1],
    ]);
  });
});
