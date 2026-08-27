import { vi } from "vitest";

export type QueryResult = { data: unknown; error: unknown };

/** Thenable Supabase query builder with recorded method calls. */
export function createQueryChain(result: QueryResult = { data: [], error: null }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;

  const methods = [
    "select",
    "eq",
    "order",
    "insert",
    "update",
    "upsert",
    "delete",
    "neq",
    "not",
    "in",
    "is",
    "limit",
    "range",
    "single",
    "maybeSingle",
    "filter",
  ] as const;

  for (const name of methods) {
    chain[name] = vi.fn(self);
  }

  chain.then = (
    onFulfilled: (value: QueryResult) => unknown,
    onRejected?: (reason: unknown) => unknown
  ) => Promise.resolve(result).then(onFulfilled, onRejected);

  return chain as typeof chain & {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
  };
}

export function jsonOf(res: Response) {
  return res.json() as Promise<Record<string, unknown>>;
}
