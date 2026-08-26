"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { useUser } from "@/contexts/UserContext";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { APP_NAV_ITEMS, isNavActive } from "@/components/layout/navItems";

export default function AppShell() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

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
        <div className="flex h-16 shrink-0 items-center gap-2.5 px-5">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] shadow-lg shadow-red-600/20 transition-shadow group-hover:shadow-red-600/40">
              <span className="text-sm font-bold tracking-tight text-white">
                CV
              </span>
            </div>
            <span className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
              CVOrotava
            </span>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
          {APP_NAV_ITEMS.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
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
          })}
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
                {user?.isAdmin ? "Admin" : "Miembro"}
              </p>
            </div>
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-surface)] px-3 py-2.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:border-transparent hover:bg-[var(--accent)] hover:text-white"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="text-xs" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar (brand + account) ── */}
      <header className="fixed inset-x-0 top-0 z-[var(--z-navbar)] flex h-14 items-center justify-between border-b border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--color-bg)_94%,transparent)] px-4 backdrop-blur-xl md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]">
            <span className="text-xs font-bold text-white">CV</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            CVOrotava
          </span>
        </Link>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-surface)] text-[var(--text-muted)] transition-colors hover:bg-[var(--accent)] hover:text-white"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="text-xs" />
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
          {APP_NAV_ITEMS.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-[0.65rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] ${
                  active
                    ? "text-[var(--accent)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="bottom-active"
                    className="absolute inset-x-2 top-1 h-0.5 rounded-full bg-[var(--accent)]"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <FontAwesomeIcon
                  icon={item.icon}
                  className="text-base"
                  aria-hidden
                />
                <span className="truncate">
                  {item.shortName ?? item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
