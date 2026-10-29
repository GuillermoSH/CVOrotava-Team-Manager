/**
 * Datos que se extraen del acta en PDF de un partido de la federación (Leverade / Clupik).
 *
 * El acta es una hoja de anotación de una página con capa de texto: el resumen de la parte de
 * abajo (resultado por set, plantillas, árbitros) y, para cada set, su panel con la alineación
 * inicial, las sustituciones y los tiempos muertos con el marcador en el que se pidieron.
 *
 * Los equipos del acta son «A» y «B», no «local» y «visitante»: la asignación al partido de la
 * federación se hace después, por nombre y comprobándola con los puntos de cada set.
 */

/** Versión del extractor: se guarda con cada acta para poder reprocesar las de una versión antigua. */
export const ACTA_PARSER_VERSION = 1;

/** Un texto del PDF con su posición (origen arriba a la izquierda, en puntos). */
export type ActaItem = { s: string; x: number; y: number };

export type Side = "A" | "B";

/**
 * Marcador en el que ocurrió algo dentro de un set, visto desde el equipo al que corresponde:
 * «13:12» en una sustitución del equipo B es B 13 y A 12 (propios:rival).
 */
export type ActaScore = { own: number; opp: number };

export type ActaPlayer = {
  number: number;
  name: string;
  libero: boolean;
};

export type ActaStaff = {
  /** «E» entrenador, «A1» y «A2» auxiliares, «M» médico, «F» fisio… tal como los rotula el acta. */
  role: string;
  name: string;
};

export type ActaSubstitution = {
  /** Posición del campo (1 a 6, en números romanos en el acta: I a VI) que se sustituye. */
  position: number;
  /** Dorsal del jugador que entra; null si el acta trae el marcador de la sustitución pero no el dorsal. */
  playerIn: number | null;
  /** Marcador en el que entra. */
  scoreIn: ActaScore;
  /** Marcador en el que el titular vuelve a su puesto, si lo hace. */
  scoreBack: ActaScore | null;
};

export type ActaTimeout = {
  /** Marcador en el que se pidió. */
  score: ActaScore;
};

/** Lo que un equipo hizo en un set. */
export type ActaSetSide = {
  /** Dorsales de la alineación inicial por posición (I a VI); 0 si no se pudo leer. */
  lineup: number[];
  substitutions: ActaSubstitution[];
  timeouts: ActaTimeout[];
  /** El equipo empieza sacando («S») o recibiendo («R»). */
  startsServing: boolean | null;
};

export type ActaSet = {
  number: number;
  /** HH:MM. */
  start: string | null;
  end: string | null;
  durationMin: number | null;
  A: ActaSetSide;
  B: ActaSetSide;
  /** Del cuadro de resultado: tiempos muertos y sustituciones contadas por el acta y puntos. */
  summary: {
    A: { timeouts: number; substitutions: number; points: number };
    B: { timeouts: number; substitutions: number; points: number };
  };
};

export type ActaSanction = {
  /** «W» amonestación, «P» penalización, «E» expulsión, «D» descalificación (la columna de la tabla de sanciones). */
  kind: "W" | "P" | "E" | "D";
  /** A quién se sanciona: el dorsal de un jugador o la letra de un miembro del cuerpo técnico («E», «D»…). */
  offender: string;
  team: Side | null;
  set: number | null;
  score: ActaScore | null;
};

export type ActaReferee = {
  role: string;
  name: string;
  license: string | null;
};

export type ActaData = {
  parserVersion: number;
  competition: string | null;
  group: string | null;
  round: string | null;
  /** YYYY-MM-DD. */
  date: string | null;
  time: string | null;
  venue: string | null;
  city: string | null;
  teams: { A: string; B: string };
  sets: ActaSet[];
  totals: {
    A: { timeouts: number; substitutions: number; setsWon: number; points: number };
    B: { timeouts: number; substitutions: number; setsWon: number; points: number };
    start: string | null;
    end: string | null;
    durationMin: number | null;
  };
  winner: { team: string; setsWinner: number; setsLoser: number } | null;
  roster: { A: ActaPlayer[]; B: ActaPlayer[] };
  staff: { A: ActaStaff[]; B: ActaStaff[] };
  referees: ActaReferee[];
  sanctions: ActaSanction[];
  comments: string | null;
};

export type ActaIssue = {
  /** «error»: el dato no es de fiar; «aviso»: se ha extraído pero algo no cuadra del todo. */
  level: "error" | "warning";
  code: string;
  message: string;
};

export type ActaParseResult = { data: ActaData | null; issues: ActaIssue[] };
