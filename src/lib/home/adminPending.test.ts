import { describe, expect, it } from "vitest";
import { pendingDocs, upcomingBirthdays } from "./adminPending";

const base = { license_completed: true, registration_papers_received: true, photo_consent: true };

describe("pendingDocs", () => {
  it("lista qué documentos faltan y omite a quien está al día", () => {
    const out = pendingDocs([
      { id: "2", full_name: "Zoe", ...base, license_completed: false },
      { id: "1", full_name: "Ana", ...base, registration_papers_received: false, photo_consent: false },
      { id: "3", full_name: "Al día", ...base },
    ]);
    expect(out.map((p) => p.name)).toEqual(["Ana", "Zoe"]);
    expect(out[0].missing).toEqual(["Hoja de inscripción", "Consentimiento de fotos"]);
    expect(out[1].missing).toEqual(["Licencia"]);
  });
});

describe("upcomingBirthdays", () => {
  const today = "2026-10-19";
  it("incluye hoy y la ventana, con la edad que cumple", () => {
    const out = upcomingBirthdays(
      [
        { id: "1", full_name: "Hoy", birth_date: "2008-10-19" },
        { id: "2", full_name: "Pronto", birth_date: "2010-10-25" },
        { id: "3", full_name: "Lejos", birth_date: "2010-12-25" },
        { id: "4", full_name: "Sin fecha", birth_date: null },
      ],
      today
    );
    expect(out.map((b) => [b.name, b.daysAway, b.turns])).toEqual([
      ["Hoy", 0, 18],
      ["Pronto", 6, 16],
    ]);
  });

  it("salta el cambio de año", () => {
    const out = upcomingBirthdays([{ id: "1", full_name: "Enero", birth_date: "2009-01-02" }], "2026-12-28");
    expect(out[0]).toMatchObject({ daysAway: 5, turns: 18, date: "2027-01-02" });
  });

  it("el 29 de febrero se celebra el 1 de marzo en años no bisiestos", () => {
    const out = upcomingBirthdays([{ id: "1", full_name: "Bisiesto", birth_date: "2008-02-29" }], "2027-02-25");
    expect(out[0]).toMatchObject({ daysAway: 4, date: "2027-03-01" });
  });
});
