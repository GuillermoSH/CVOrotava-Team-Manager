"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRightFromBracket,
  faHome,
  faCalendarDays,
  faVideo,
  faChartSimple,
  faMoneyBill,
} from "@fortawesome/free-solid-svg-icons";
import { useUser } from "@/contexts/UserContext";
import ThemeToggle from "@/components/ui/ThemeToggle";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const [openMobile, setOpenMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Scroll listener for navbar background change
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  type NavItem = { name: string; href: string; icon: IconDefinition };

  const navItems: NavItem[] = [
    { name: "Inicio", href: "/", icon: faHome },
    { name: "Calendario", href: "/matches", icon: faCalendarDays },
    { name: "Videos", href: "/videos", icon: faVideo },
    { name: "Estadísticas", href: "/stats", icon: faChartSimple },
    { name: "Pagos", href: "/payments", icon: faMoneyBill },
  ];

  const isActive = (href: string) => pathname === href;

  // User initials for avatar
  const initials = user?.user_name
    ? user.user_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "?";

  return (
    <header
      className={`w-full fixed top-0 z-[var(--z-navbar)] transition-all duration-300 ${
        scrolled
          ? "bg-[color-mix(in_srgb,var(--color-bg)_92%,transparent)] backdrop-blur-xl border-b border-[var(--glass-border)] shadow-lg shadow-black/20"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* LEFT: Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-600/20 group-hover:shadow-red-600/40 transition-shadow duration-300">
            <span className="text-white font-bold text-sm tracking-tight">CV</span>
          </div>
          <span className="text-[var(--text-primary)] text-base font-semibold tracking-tight hidden sm:block">
            CVOrotava
          </span>
        </Link>

        {/* CENTER: Desktop navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                isActive(item.href)
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--glass-surface)]"
              }`}
            >
              <span className="relative z-10 flex items-center gap-2">
                <FontAwesomeIcon icon={item.icon} className="text-xs" />
                {item.name}
              </span>
              {/* Active indicator (behind label so text stays readable) */}
              {isActive(item.href) && (
                <motion.div
                  layoutId="navbar-indicator"
                  className="pointer-events-none absolute inset-0 z-0 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-surface)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          ))}
        </nav>

        {/* RIGHT: theme, avatar, logout, hamburger */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* Avatar */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/10 border border-[var(--glass-border)] flex items-center justify-center">
              <span className="text-xs font-semibold text-red-500">{initials}</span>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="hidden sm:flex items-center gap-2 text-[var(--text-muted)] hover:text-white bg-[var(--glass-surface)] border border-[var(--glass-border)] hover:border-transparent hover:bg-red-600 px-3 py-2 rounded-lg text-sm transition-all duration-200"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="text-xs" />
            <span className="hidden lg:inline text-xs font-medium">Salir</span>
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setOpenMobile((v) => !v)}
            aria-label="Abrir menú"
            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-surface)] transition"
          >
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {openMobile ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {openMobile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden overflow-hidden bg-[color-mix(in_srgb,var(--color-bg)_96%,transparent)] backdrop-blur-xl border-t border-[var(--glass-border)]"
          >
            <div className="px-3 py-3 flex flex-col gap-1">
              {navItems.map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setOpenMobile(false)}
                    className={`flex items-center gap-3 text-sm font-medium px-3 py-2.5 rounded-lg transition-all ${
                      isActive(item.href)
                        ? "text-[var(--text-primary)] bg-[var(--glass-surface)] border border-[var(--glass-border)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-surface)]"
                    }`}
                  >
                    <FontAwesomeIcon icon={item.icon} className="text-xs w-4" />
                    {item.name}
                  </Link>
                </motion.div>
              ))}

              <div className="pt-2 mt-1 border-t border-[var(--glass-border)]">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 justify-center btn-primary py-2.5 rounded-lg text-sm"
                >
                  <FontAwesomeIcon icon={faRightFromBracket} />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
