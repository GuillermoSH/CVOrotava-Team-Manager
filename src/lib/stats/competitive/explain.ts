import type { AttributeKey } from "./metrics";

/** Texto llano de cada atributo de la ficha; los pesos y las muestras mínimas salen de ATTRIBUTE_DEFS. */
export const ATTRIBUTE_HELP: Record<AttributeKey, { what: string; how: string; unit: string }> = {
  ATA: {
    what: "Cuántos puntos anotamos de media en cada set.",
    how: "Puntos a favor ÷ sets jugados. Cuantos más puntos por set, mejor.",
    unit: "sets jugados",
  },
  DEF: {
    what: "Cuántos puntos encajamos de media en cada set.",
    how: "Puntos en contra ÷ sets jugados. Aquí menos es mejor: el equipo que menos encaja saca el 99.",
    unit: "sets jugados",
  },
  CIE: {
    what: "Cómo se resuelven los sets igualados (decididos por 3 puntos o menos).",
    how: "Sets igualados ganados ÷ sets igualados jugados.",
    unit: "sets igualados",
  },
  REM: {
    what: "Si el equipo es capaz de darle la vuelta al partido tras perder el primer set.",
    how: "Partidos ganados tras perder el 1.er set ÷ partidos en los que se perdió el 1.er set.",
    unit: "partidos con el 1.er set perdido",
  },
  LOC: {
    what: "Lo fuerte que es el equipo jugando en casa.",
    how: "Victorias en casa ÷ partidos jugados en casa.",
    unit: "partidos en casa",
  },
  VIA: {
    what: "Lo fuerte que es el equipo jugando fuera.",
    how: "Victorias fuera ÷ partidos jugados fuera.",
    unit: "partidos fuera",
  },
};
