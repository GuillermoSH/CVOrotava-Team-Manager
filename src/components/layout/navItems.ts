import {
  faHome,
  faCalendarDays,
  faVideo,
  faChartSimple,
  faListOl,
  faMoneyBill,
  faUsers,
  faLocationDot,
  faAddressBook,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export type AppNavItem = {
  name: string;
  href: string;
  icon: IconDefinition;
  /** Short label for bottom bar (optional). */
  shortName?: string;
  /** Only shown to club admins. */
  adminOnly?: boolean;
  /**
   * Incluir en la barra inferior móvil (igual para todos los roles: cuatro pestañas y «Más»).
   * Default: true si no es adminOnly. Lo que no cabe va a la hoja «Más».
   */
  bottomNav?: boolean;
};

/**
 * Orden de lectura: lo de cada semana primero (inicio, partidos, jornadas de la liga, vídeos) y,
 * después, lo que se mira de vez en cuando (estadísticas del club, pagos). En el móvil las cuatro
 * primeras son pestañas y el resto, con la gestión del admin, va en «Más».
 */
export const APP_NAV_ITEMS: AppNavItem[] = [
  { name: "Inicio", href: "/", icon: faHome },
  { name: "Calendario", href: "/matches", icon: faCalendarDays, shortName: "Partidos" },
  { name: "Jornadas", href: "/jornadas", icon: faListOl },
  { name: "Videos", href: "/videos", icon: faVideo },
  { name: "Estadísticas", href: "/stats", icon: faChartSimple, bottomNav: false },
  { name: "Pagos", href: "/payments", icon: faMoneyBill, bottomNav: false },
  {
    name: "Pabellones",
    href: "/venues",
    icon: faLocationDot,
    adminOnly: true,
  },
  {
    name: "Contactos",
    href: "/contacts",
    icon: faAddressBook,
    adminOnly: true,
  },
  {
    name: "Usuarios",
    href: "/access",
    icon: faUsers,
    adminOnly: true,
  },
];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
