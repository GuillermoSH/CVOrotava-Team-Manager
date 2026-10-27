import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { syncOfflineCacheOwner } from "./offlineCache";

const OWNER_KEY = "cvo-offline-owner";

describe("syncOfflineCacheOwner", () => {
  let store: Record<string, string>;
  let deleted: string[];

  beforeEach(() => {
    store = {};
    deleted = [];
    const cacheStorage = {
      keys: async () => ["cvo-api-v2", "otra-cosa"],
      delete: async (k: string) => {
        deleted.push(k);
        return true;
      },
    };
    vi.stubGlobal("window", {
      caches: cacheStorage,
      localStorage: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
      },
    });
    vi.stubGlobal("caches", cacheStorage);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("el primer usuario del dispositivo solo queda anotado", async () => {
    await syncOfflineCacheOwner("u1");
    expect(store[OWNER_KEY]).toBe("u1");
    expect(deleted).toEqual([]);
  });

  it("el mismo usuario no vacía nada", async () => {
    store[OWNER_KEY] = "u1";
    await syncOfflineCacheOwner("u1");
    expect(deleted).toEqual([]);
  });

  it("otro usuario vacía solo las cachés cvo-* y pasa a ser el dueño", async () => {
    store[OWNER_KEY] = "u1";
    await syncOfflineCacheOwner("u2");
    expect(deleted).toEqual(["cvo-api-v2"]);
    expect(store[OWNER_KEY]).toBe("u2");
  });
});
