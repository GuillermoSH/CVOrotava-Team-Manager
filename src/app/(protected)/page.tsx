"use client";

import Link from "next/link";
import { useUser } from "@/contexts/UserContext";

export default function ProtectedHome() {
  const { user, loading } = useUser();

  const cards = [
    {
      title: "Calendario de Partidos",
      description: "Consulta el calendario completo de la temporada.",
      href: "/matches",
      disabled: false,
    },
    {
      title: "Videos",
      description: "Accede a la lista de videos grabados.",
      href: "/videos",
      disabled: false,
    },
    {
      title: "Próximamente",
      description: "Nuevas funcionalidades estarán disponibles aquí.",
      href: "",
      disabled: true,
    },
  ];

  // Solo si el usuario es admin, agregamos las opciones de creación
  if (!loading && user?.isAdmin) {
    cards.unshift(
      {
        title: "Crear Videos",
        description: "Sube nuevos videos a la plataforma.",
        href: "/videos/create",
        disabled: false,
      },
      {
        title: "Crear Partidos",
        description: "Añade nuevos partidos al calendario.",
        href: "/matches/create",
        disabled: false,
      }
    );
  }

  return (
    <main className="flex flex-col w-full items-center p-6">
      <h1 className="text-3xl text-white font-bold mb-8 text-center">
        Bienvenido a tu Panel
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
        {cards.map((card, idx) =>
          card.disabled ? (
            <div
              key={idx}
              className="bg-gray-300 backdrop-blur-md shadow-md rounded-2xl p-6 flex flex-col justify-between opacity-60 cursor-not-allowed"
            >
              <h2 className="text-xl text-gray-600 font-semibold mb-2">
                {card.title}
              </h2>
              <p className="text-gray-400 flex-1">{card.description}</p>
              <span className="mt-4 inline-block px-4 py-2 rounded-xl font-medium bg-gray-600/50 text-gray-200">
                Deshabilitado
              </span>
            </div>
          ) : (
            <Link
              key={idx}
              href={card.href}
              className="bg-gray-300 text-gray-900 shadow-md rounded-2xl p-6 flex flex-col justify-between transition hover:shadow-lg hover:bg-gray-50"
            >
              <h2 className="text-xl font-semibold mb-2">{card.title}</h2>
              <p className="text-gray-600 flex-1">{card.description}</p>
              <span className="mt-4 inline-block px-4 py-2 rounded-xl font-medium bg-gray-950 text-white hover:bg-gray-800 transition">
                Entrar
              </span>
            </Link>
          )
        )}
      </div>
    </main>
  );
}
