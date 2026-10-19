"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faEllipsis,
  faEllipsisVertical,
  faGear,
  faMoon,
  faRightFromBracket,
  faSun,
} from "@fortawesome/free-solid-svg-icons";
import { useUser } from "@/contexts/UserContext";
import { useNavPending } from "@/contexts/NavPendingContext";
import { useTheme } from "@/contexts/ThemeContext";
import ThemeToggle from "@/components/ui/ThemeToggle";
import ClubLogo from "@/components/brand/ClubLogo";
import { APP_NAV_ITEMS, type AppNavItem } from "@/components/layout/navItems";

function SidebarNavLink({
  item,
  active,
  onNavigate,
}: {
  item: AppNavItem;
  active: boolean;
  onNavigate: (href: string) => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={() => onNavigate(item.href)}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
        active
          ? "text-[var(--text-primary)]"
          : "text-[var(--text-muted)] hover:bg-[var(--glass-surface)] hover:text-[var(--text-secondary)]"
      }`}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-surface)]"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-3">
        <FontAwesomeIcon
          icon={item.icon}
          className={`w-4 text-sm ${active ? "text-[var(--accent)]" : ""}`}
        />
        {item.name}
      </span>
    </Link>
  );
}

/** Cierra un menú al pulsar fuera o con Escape. */
function useDismiss(open: boolean, close: () => void, rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, rootRef]);
}

/** Varias secciones de gestión en un solo elemento del menú, con los enlaces desplegados debajo. */
function SidebarNavGroup({
  label,
  icon,
  items,
  isActive,
  onNavigate,
}: {
  label: string;
  icon: AppNavItem["icon"];
  items: AppNavItem[];
  isActive: (href: string) => boolean;
  onNavigate: (href: string) => void;
}) {
  const panelId = useId();
  const anyActive = items.some((item) => isActive(item.href));
  // null = sin decisión del usuario: se abre solo si hay una sección activa dentro.
  const [manual, setManual] = useState<boolean | null>(null);
  const expanded = manual ?? anyActive;

  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setManual(!expanded)}
        className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
          anyActive
            ? "text-[var(--text-primary)]"
            : "text-[var(--text-muted)] hover:bg-[var(--glass-surface)] hover:text-[var(--text-secondary)]"
        }`}
      >
        <FontAwesomeIcon icon={icon} className={`w-4 text-sm ${anyActive ? "text-[var(--accent)]" : ""}`} />
        <span className="flex-1 text-left">{label}</span>
        <FontAwesomeIcon
          icon={faChevronDown}
          aria-hidden
          className={`text-[0.65rem] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden" inert={!expanded}>
          <ul className="mt-0.5 flex flex-col gap-0.5 border-l border-[var(--glass-border)] py-0.5 pl-3 ml-[1.35rem]">
            {items.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => onNavigate(item.href)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                      active
                        ? "bg-[var(--glass-surface)] font-medium text-[var(--accent)]"
                        : "text-[var(--text-muted)] hover:bg-[var(--glass-surface)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    <FontAwesomeIcon icon={item.icon} className="w-3.5 text-xs" aria-hidden />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Perfil compacto al pie del menú; al pulsarlo se despliegan tema y cierre de sesión. */
function SidebarProfile({
  name,
  role,
  initials,
  onLogout,
}: {
  name: string;
  role: string;
  initials: string;
  onLogout: () => void;
}) {
  const { theme, setTheme, mounted } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const close = () => setOpen(false);
  useDismiss(open, close, rootRef);

  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus();
  }, [open]);

  const onMenuKey = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Escape") return;
    if (event.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    event.preventDefault();
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "ArrowDown" ? index + 1 : index - 1;
    items[(next + items.length) % items.length]?.focus();
  };

  const rowClass =
    "flex h-8 w-full cursor-pointer items-center justify-between gap-3 rounded-md px-2 text-left text-[13px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-faint)] hover:text-[var(--text-primary)] focus-visible:bg-[var(--surface-faint)] focus-visible:text-[var(--text-primary)] focus-visible:outline-none";

  return (
    <div ref={rootRef} className="relative mt-auto border-t border-[var(--glass-border)] p-3">
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Cuenta"
          onKeyDown={onMenuKey}
          className="absolute inset-x-3 bottom-[calc(100%-0.25rem)] z-[var(--z-dropdown)] rounded-lg border border-[var(--glass-border)] bg-[var(--color-bg-elevated)] p-1 shadow-lg shadow-black/20"
        >
          <div className="px-2 pb-2 pt-1.5">
            <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">{name}</p>
            <p className="truncate text-xs text-[var(--text-muted)]">{role}</p>
          </div>
          <div role="separator" className="-mx-1 my-1 h-px bg-[var(--glass-border)]" />

          <div className="flex h-8 items-center justify-between gap-3 px-2 text-[13px] text-[var(--text-secondary)]">
            <span id={`${menuId}-theme`}>Tema</span>
            <div
              role="group"
              aria-labelledby={`${menuId}-theme`}
              className="flex items-center gap-0.5 rounded-md border border-[var(--glass-border)] p-0.5"
            >
              {(
                [
                  { value: "light", label: "Claro", icon: faSun },
                  { value: "dark", label: "Oscuro", icon: faMoon },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={theme === opt.value}
                  aria-label={opt.label}
                  title={opt.label}
                  disabled={!mounted}
                  onClick={() => setTheme(opt.value)}
                  className={`inline-flex size-6 cursor-pointer items-center justify-center rounded text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-60 ${
                    theme === opt.value
                      ? "bg-[var(--glass-surface)] text-[var(--text-primary)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <FontAwesomeIcon icon={opt.icon} aria-hidden />
                </button>
              ))}
            </div>
          </div>

          <div role="separator" className="-mx-1 my-1 h-px bg-[var(--glass-border)]" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className={rowClass}
          >
            Cerrar sesión
            <FontAwesomeIcon icon={faRightFromBracket} className="text-xs text-[var(--text-muted)]" aria-hidden />
          </button>
        </div>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full cursor-pointer items-center gap-3 rounded-xl p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
          open ? "bg-[var(--glass-surface)]" : "hover:bg-[var(--glass-surface)]"
        }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--accent-muted)] text-xs font-semibold text-[var(--accent)]">
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-[var(--text-primary)]">{name}</span>
          <span className="block truncate text-xs text-[var(--text-muted)]">{role}</span>
        </span>
        <FontAwesomeIcon icon={faEllipsisVertical} aria-hidden className="shrink-0 text-sm text-[var(--text-muted)]" />
      </button>
    </div>
  );
}

function BottomNavLink({
  item,
  active,
  onNavigate,
}: {
  item: AppNavItem;
  active: boolean;
  onNavigate: (href: string) => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={() => onNavigate(item.href)}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] ${
        active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
      }`}
    >
      {active && (
        <motion.span
          layoutId="bottom-active"
          className="absolute inset-x-2 top-1 h-0.5 rounded-full bg-[var(--accent)]"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <FontAwesomeIcon icon={item.icon} className="text-lg" aria-hidden />
      <span className="max-w-full truncate leading-tight">{item.shortName ?? item.name}</span>
    </Link>
  );
}

function MobileMoreMenu({
  items,
  isActive,
  onNavigate,
}: {
  items: AppNavItem[];
  isActive: (href: string) => boolean;
  onNavigate: (href: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const anyActive = items.some((item) => isActive(item.href));

  useDismiss(open, () => setOpen(false), rootRef);

  if (items.length === 0) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-11 min-w-11 cursor-pointer touch-manipulation items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
          open || anyActive
            ? "border-[var(--glass-border)] bg-[var(--glass-surface)] text-[var(--accent)]"
            : "border-[var(--glass-border)] bg-[var(--glass-surface)] text-[var(--text-secondary)]"
        }`}
      >
        <FontAwesomeIcon icon={faEllipsis} className="text-sm" aria-hidden />
        Más
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Más secciones"
          className="absolute right-0 top-[calc(100%+0.4rem)] z-[var(--z-dropdown)] w-56 overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--color-bg-elevated)] py-1 shadow-xl shadow-black/25"
        >
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                role="menuitem"
                href={item.href}
                onClick={() => {
                  onNavigate(item.href);
                  setOpen(false);
                }}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 px-3.5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] ${
                  active
                    ? "bg-[var(--accent-muted)] text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-faint)] hover:text-[var(--text-primary)]"
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="w-4 text-sm" aria-hidden />
                {item.name}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function AppShell() {
  const router = useRouter();
  const { markPending, isActive } = useNavPending();
  const { user } = useUser();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  const navItems = APP_NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !user?.isAdmin) return false;
    if (user && user.isActive === false) {
      return item.href === "/payments";
    }
    return true;
  });
  const bottomNavItems = navItems.filter(
    (item) => !item.adminOnly && item.bottomNav !== false
  );
  const moreMenuItems = navItems.filter(
    (item) => item.adminOnly || item.bottomNav === false
  );
  // Escritorio: lo de gestión (solo admin) va agrupado en un único elemento desplegable.
  const sidebarItems = navItems.filter((item) => !item.adminOnly);
  const adminItems = navItems.filter((item) => item.adminOnly);

  const initials = user?.user_name
    ? user.user_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "?";

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className="fixed inset-y-0 left-0 z-[var(--z-navbar)] hidden w-[var(--sidebar-width)] flex-col border-r border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--color-bg)_94%,transparent)] backdrop-blur-xl md:flex"
        aria-label="Navegación principal"
      >
        <div className="flex h-16 shrink-0 items-center justify-center px-5">
          <Link
            href="/"
            onClick={() => markPending("/")}
            aria-label="Inicio — C.V. Orotava"
            className="rounded-lg p-1 transition-colors hover:bg-[var(--glass-surface)]"
          >
            <ClubLogo size="nav" className="size-12" px={56} />
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
          {sidebarItems.map((item) => (
            <SidebarNavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              onNavigate={markPending}
            />
          ))}
          {adminItems.length > 0 ? (
            <SidebarNavGroup
              label="Configuración"
              icon={faGear}
              items={adminItems}
              isActive={isActive}
              onNavigate={markPending}
            />
          ) : null}
        </nav>

        <SidebarProfile
          name={user?.user_name ?? "Usuario"}
          role={
            user?.isAdmin
              ? "Admin"
              : user?.isActive === false
                ? "Inactivo · solo pagos"
                : "Miembro"
          }
          initials={initials}
          onLogout={handleLogout}
        />
      </aside>

      {/* ── Mobile top bar (brand + account) ── */}
      <header className="fixed inset-x-0 top-0 z-[var(--z-navbar)] flex h-14 items-center justify-between border-b border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--color-bg)_94%,transparent)] px-3 backdrop-blur-xl md:hidden">
        <Link
          href="/"
          onClick={() => markPending("/")}
          aria-label="Inicio — C.V. Orotava"
          className="rounded-lg p-0.5 transition-colors hover:bg-[var(--glass-surface)]"
        >
          <ClubLogo size="nav" />
        </Link>
        <div className="flex items-center gap-1.5">
          <MobileMoreMenu items={moreMenuItems} isActive={isActive} onNavigate={markPending} />
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="inline-flex h-11 w-11 cursor-pointer touch-manipulation items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-surface)] text-[var(--text-muted)] transition-colors hover:bg-[var(--accent)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="text-sm" />
          </button>
        </div>
      </header>

      {/* ── Mobile bottom nav ── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-[var(--z-navbar)] border-t border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--color-bg)_96%,transparent)] backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Navegación principal"
      >
        <div className="flex h-[var(--bottom-nav-height)] items-stretch justify-around px-1">
          {bottomNavItems.map((item) => (
            <BottomNavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              onNavigate={markPending}
            />
          ))}
        </div>
      </nav>
    </>
  );
}
