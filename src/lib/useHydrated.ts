"use client";

import { useSyncExternalStore } from "react";

const subscribeNever = () => () => {};

/** false en servidor y durante la hidratación, true después (sin efecto ni setState). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  );
}
