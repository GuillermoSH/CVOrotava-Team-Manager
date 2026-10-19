"use client";

import { useCallback, useSyncExternalStore } from "react";
import { readPref, writePref } from "@/lib/prefs";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Preferencia en localStorage sin efecto de lectura: en servidor y durante la
 * hidratación devuelve `parse(null)` (el valor por defecto) y después el
 * guardado. `parse` debe devolver siempre un valor válido y primitivo.
 */
export function usePref<T extends string>(
  key: string,
  parse: (raw: string | null) => T
): [T, (next: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => parse(readPref(key)),
    () => parse(null)
  );

  const set = useCallback(
    (next: T) => {
      writePref(key, next);
      listeners.forEach((l) => l());
    },
    [key]
  );

  return [value, set];
}
