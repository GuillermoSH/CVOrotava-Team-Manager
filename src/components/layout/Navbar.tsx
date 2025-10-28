"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { useUser } from "@/contexts/UserContext";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();

  const [openMobile, setOpenMobile] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error("❌ Error al cerrar sesión:", err);
    }
  };

  const navItems = [
    { name: "Inicio", href: "/" },
    { name: "Calendario", href: "/matches" },
    { name: "Videos", href: "/videos" },
  ];

  if (user?.isAdmin) {
    navItems.push({ name: "Crear partido", href: "/matches/create" });
    navItems.push({ name: "Subir vídeo", href: "/videos/create" });
  }

  return (
    <header className="w-full bg-black/70 backdrop-blur-md border-b border-white/10 fixed top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
        {/* LEFT: Logo */}
        <div className="flex items-center gap-3">
          <Link href="/home" className="flex items-center gap-3">
            {/* Si no tienes el SVG, sustituye por un div con texto */}
            <div className="w-9 h-9 rounded-full overflow-hidden bg-red-600 flex items-center justify-center">
              {/* si usas Image, descomenta la linea siguiente y comenta el div */}
              {/* <Image src="/assets/logos/orotava-shield.svg" alt="CVOrotava" width={36} height={36} /> */}
              <span className="text-white font-bold text-sm">CV</span>
            </div>
            <span className="text-white text-lg font-semibold">CVOrotava</span>
          </Link>
        </div>

        {/* CENTER: Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                "text-sm font-medium transition " +
                (pathname === item.href
                  ? "text-red-500"
                  : "text-white/80 hover:text-red-300")
              }
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* RIGHT: user + hamburger */}
        <div className="flex items-center gap-3">
          {/* Logout button (uses FontAwesomeIcon) */}
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white px-3 py-1.5 rounded-lg text-sm shadow-md transition duration-200"
          >
            <FontAwesomeIcon icon={faRightFromBracket} />
            <span className="hidden sm:inline">Salir</span>
          </button>

          {/* Mobile menu button */}
          <button
            onClick={() => setOpenMobile((v) => !v)}
            aria-label="Abrir menú"
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-white/90 hover:bg-white/5"
          >
            <svg
              className="h-6 w-6"
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
      {openMobile && (
        <div className="md:hidden bg-black/50 border-t border-white/5">
          <div className="px-4 py-3 flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpenMobile(false)}
                className={
                  "block text-sm font-medium px-2 py-2 rounded-md " +
                  (pathname === item.href ? "text-red-400" : "text-white/90 hover:text-red-300")
                }
              >
                {item.name}
              </Link>
            ))}

            <div className="pt-2 border-t border-white/5">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 justify-center bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-md"
              >
                <FontAwesomeIcon icon={faRightFromBracket} />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
