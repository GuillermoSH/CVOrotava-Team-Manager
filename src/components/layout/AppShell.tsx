"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsis, faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { useUser } from "@/contexts/UserContext";
import { useNavPending } from "@/contexts/NavPendingContext";
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

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
          {navItems.map((item) => (
            <SidebarNavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              onNavigate={markPending}
            />
          ))}
        </nav>

        <div className="mt-auto space-y-3 border-t border-[var(--glass-border)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--accent-muted)]">
              <span className="text-xs font-semibold text-[var(--accent)]">
                {initials}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                {user?.user_name ?? "Usuario"}
              </p>
              <p className="truncate text-xs text-[var(--text-muted)]">
                {user?.isAdmin
                  ? "Admin"
                  : user?.isActive === false
                    ? "Inactivo · solo pagos"
                    : "Miembro"}
              </p>
            </div>
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-surface)] px-3 py-2.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:border-transparent hover:bg-[var(--accent)] hover:text-white"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="text-xs" />
            Cerrar sesión
          </button>
        </div>
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
