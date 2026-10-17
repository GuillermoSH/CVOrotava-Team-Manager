/**
 * Cliente mínimo para la API pública (JSON:API) de Leverade, plataforma que usa
 * la Federación Canaria de Voleibol. Solo lectura, sin token.
 *
 * - La API bloquea el User-Agent por defecto de algunos runtimes (403) → UA propio.
 * - 429 / 5xx → reintento con backoff exponencial.
 */
export const LEVERADE_API = "https://api.leverade.com";
export const FCVB_MANAGER_ID = "288589";

const USER_AGENT = "CVOrotava-TeamManager/1.0 (+https://github.com/GuillermoSH)";
const MAX_ATTEMPTS = 4;
const TIMEOUT_MS = 60_000;

export type JsonApiResource = {
  type: string;
  id: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<
    string,
    { data: { type: string; id: string } | { type: string; id: string }[] | null }
  >;
  meta?: Record<string, unknown>;
};

export type JsonApiDocument = {
  data: JsonApiResource | JsonApiResource[];
  included?: JsonApiResource[];
  meta?: Record<string, unknown>;
  errors?: { code?: string; title?: string; detail?: string }[];
};

export class LeveradeError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "LeveradeError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function leveradeGet(
  path: string,
  fetchImpl: typeof fetch = fetch
): Promise<JsonApiDocument> {
  const url = `${LEVERADE_API}/${path.replace(/^\//, "")}`;

  for (let attempt = 1; ; attempt++) {
    const res = await fetchImpl(url, {
      headers: {
        Accept: "application/vnd.api+json",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < MAX_ATTEMPTS) {
      const retryAfter = Number(res.headers.get("retry-after"));
      await sleep(
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 1000 * 2 ** attempt
      );
      continue;
    }

    const body = (await res.json().catch(() => null)) as JsonApiDocument | null;
    if (!res.ok || !body || body.errors) {
      const detail = body?.errors?.[0]?.detail ?? res.statusText;
      throw new LeveradeError(`Leverade ${res.status} on ${path}: ${detail}`, res.status);
    }
    return body;
  }
}
