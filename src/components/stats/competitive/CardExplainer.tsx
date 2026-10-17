import { MIN_MATCHES_FOR_CARD, MIN_MATCHES_FOR_RATING, RATING_WEIGHT, TIER_MIN } from "@/lib/stats/competitive/card";
import { ELO_DEFAULT } from "@/lib/stats/competitive/elo";
import { ATTRIBUTE_HELP } from "@/lib/stats/competitive/explain";
import { ATTRIBUTE_DEFS, type Attribute } from "@/lib/stats/competitive/metrics";

const pct = (weight: number) => `${String(Math.round(weight * 1000) / 10).replace(".", ",")} %`;

const H4 = "font-semibold text-[var(--text-secondary)]";

export default function CardExplainer({
  teamName,
  attributes,
}: Readonly<{ teamName: string; attributes: Attribute[] }>) {
  const carry = Math.round(ELO_DEFAULT.carry * 100);

  return (
    <details className="group mt-4 text-sm">
      <summary className="cursor-pointer text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
        Cómo sale cada número
      </summary>

      <div className="mt-3 space-y-4 text-[var(--text-muted)]">
        <p>
          La ficha compara a {teamName} con el resto de equipos de su grupo, usando solo partidos ya jugados de la
          liga de la federación.
        </p>

        <section aria-labelledby="ficha-escala">
          <h4 id="ficha-escala" className={H4}>
            La escala de 45 a 99
          </h4>
          <p className="mt-1">
            Cada atributo es una comparación, no un porcentaje: el mejor equipo del grupo saca 99, el peor saca 45 y
            los demás se reparten entre medias según el puesto que ocupan en esa característica. Un 72 significa estar
            justo en la mitad del grupo.
          </p>
        </section>

        <section aria-labelledby="ficha-atributos">
          <h4 id="ficha-atributos" className={H4}>
            Los seis atributos
          </h4>
          <ul className="mt-1 space-y-3">
            {attributes.map((a) => {
              const def = ATTRIBUTE_DEFS.find((d) => d.key === a.key);
              const help = ATTRIBUTE_HELP[a.key];
              if (!def) return null;
              return (
                <li key={a.key}>
                  <p>
                    <span className="font-medium text-[var(--text-secondary)]">{a.label}</span>
                    {a.value === null ? " · sin dato todavía" : ` · ${a.value}`}
                  </p>
                  <p>{help.what}</p>
                  <p>Cálculo: {help.how}</p>
                  <p>
                    {a.value === null
                      ? `Hace falta tener al menos ${def.minSample} ${help.unit} para calcularlo.`
                      : `Vuestros números: ${a.detail}.`}
                  </p>
                  <p>
                    Pesa un {pct(def.weight)} en la valoración
                    {a.value === null ? "" : `; se calcula con al menos ${def.minSample} ${help.unit}`}.
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="ficha-valoracion">
          <h4 id="ficha-valoracion" className={H4}>
            La valoración global (el número grande)
          </h4>
          <p className="mt-1">
            Es una media con pesos: un {pct(RATING_WEIGHT)} es el nivel del equipo en la liga y el{" "}
            {pct(1 - RATING_WEIGHT)} restante lo ponen los seis atributos con el peso que se indica arriba. Si a un
            atributo todavía le faltan partidos, no cuenta y los demás se reparten su peso.
          </p>
          <p className="mt-1">
            El nivel en la liga parte igual para todos y, tras cada partido, sube o baja según el resultado y el rival:
            ganar a un equipo fuerte o por 3-0 suma más que ganar a uno flojo o por 3-2, y perder contra un rival
            flojo resta más. Al empezar una temporada se conserva un {carry} % del nivel del curso anterior. Se
            necesitan al menos {MIN_MATCHES_FOR_RATING} partidos jugados (o venir de la temporada pasada) para que
            cuente. Después se pasa a la misma escala de 45 a 99 comparando con el grupo.
          </p>
        </section>

        <section aria-labelledby="ficha-categorias">
          <h4 id="ficha-categorias" className={H4}>
            Oro, Plata y Bronce
          </h4>
          <p className="mt-1">
            Oro desde {TIER_MIN.oro}, Plata de {TIER_MIN.plata} a {TIER_MIN.oro - 1} y Bronce por debajo de{" "}
            {TIER_MIN.plata}. Hasta jugar {MIN_MATCHES_FOR_CARD} partidos la ficha no se calcula: se enseña la de la
            temporada anterior con un aviso.
          </p>
        </section>
      </div>
    </details>
  );
}
