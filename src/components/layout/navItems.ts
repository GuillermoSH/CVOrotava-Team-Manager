import {
  faHome,
  faCalendarDays,
  faVideo,
  faChartSimple,
  faMoneyBill,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export type AppNavItem = {
  name: string;
  href: string;
  icon: IconDefinition;
  /** Short label for bottom bar (optional). */
  shortName?: string;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { name: "Inicio", href: "/", icon: faHome },
  { name: "Calendario", href: "/matches", icon: faCalendarDays, shortName: "Partidos" },
  { name: "Videos", href: "/videos", icon: faVideo },
  { name: "Estadísticas", href: "/stats", icon: faChartSimple, shortName: "Stats" },
  { name: "Pagos", href: "/payments", icon: faMoneyBill },
];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
