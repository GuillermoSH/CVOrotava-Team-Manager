export const EMAIL_LOGO_CID = "cvorotava-logo";

/** Shown in Gmail as the sender name. Quoted so the dots in C.V. parse as a name, not an address. */
export const EMAIL_FROM_NAME = "C.V. Orotava - Puerto de la Cruz";

/** `Name <addr>` even if the env var is only the address. */
export function formatClubFrom(raw: string) {
  const trimmed = raw.trim();
  const angle = /<([^>]+)>/.exec(trimmed);
  const address = (angle?.[1] ?? trimmed).replace(/^["']+|["']+$/g, "").trim();
  return `"${EMAIL_FROM_NAME}" <${address}>`;
}

/** Club bulletin — volcanic ground, night masthead, paper body. */
export const emailBrand = {
  accent: "#e62222",
  night: "#0d0d0f",
  masthead: "#141418",
  stone: "#3a3532",
  paper: "#f7f5f2",
  ink: "#16141a",
  inkSoft: "#4a4548",
  line: "#e4dfd8",
  onNight: "#f4f4f0",
  onNightSoft: "#c8c0b8",
  radiusCard: "20px",
  radiusLogo: "16px",
  radiusButton: "16px",
} as const;

export const emailFont =
  'Arial, "Helvetica Neue", Helvetica, sans-serif';

export function formatEmailSentAt(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Atlantic/Canary",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Unique per send (datetime) so Gmail does not trim it as a repeated signature. */
export function clubEmailFooter(sentAt: Date) {
  const when = formatEmailSentAt(sentAt);
  return [
    "Imprimir este aviso cuenta como toque de la red. Léelo digitalmente y deja el papel para las actas, no para la bandeja de entrada.",
    `No hace falta responder a este aviso · ${when}`,
  ].join("\n\n");
}

