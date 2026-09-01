/** Calendar date `YYYY-MM-DD` in the Canary Islands. */
export function todayDateInput() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Atlantic/Canary",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export const DATE_INPUT_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}/;

/** Normalize timestamptz or date strings to `YYYY-MM-DD` for <input type="date">. */
export function toDateInput(value?: string | null) {
  if (!value) return todayDateInput();
  if (DATE_ONLY.test(value)) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Atlantic/Canary",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

/** Date used to sort, group, and show a video (recording day, not upload day). */
export function videoRecordedDate(video: {
  recorded_at?: string | null;
  created_at: string;
  match?: { date?: string | null } | null;
}) {
  return toDateInput(
    video.recorded_at || video.match?.date || video.created_at
  );
}
