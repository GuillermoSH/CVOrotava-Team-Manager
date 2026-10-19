import { useCallback, useSyncExternalStore } from "react";

export const SIDEBAR_COLLAPSED_KEY = "cvorotava-sidebar-collapsed";
const CHANGE_EVENT = "cvorotava:sidebar-collapsed";

/**
 * El estado vive en `data-sidebar` del <html> (lo fija un script antes de pintar,
 * ver `sidebarInit` en el layout raíz) para que `--sidebar-width` ya sea correcto
 * en el primer render y no haya salto de layout.
 */
export function readSidebarCollapsed(): boolean {
  return document.documentElement.dataset.sidebar === "collapsed";
}

export function writeSidebarCollapsed(collapsed: boolean) {
  document.documentElement.dataset.sidebar = collapsed ? "collapsed" : "expanded";
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* almacenamiento bloqueado: el estado dura lo que la pestaña */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

export function useSidebarCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(subscribe, readSidebarCollapsed, () => false);
  const toggle = useCallback(() => writeSidebarCollapsed(!readSidebarCollapsed()), []);
  return [collapsed, toggle];
}
