import MatchForm from "@/components/calendar/MatchForm";
import Link from "next/link";

export default function CrearPartidoPage() {
  return (
    <main className="flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-gray-200 p-6 sm:p-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            ⚽ Crear Partido
          </h1>
          <Link
            href="/calendar"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
          >
            ← Volver al calendario
          </Link>
        </div>

        <p className="text-gray-500 text-sm mb-8 text-center sm:text-left">
          Completa la información del encuentro. Los campos marcados con * son
          obligatorios.
        </p>

        <MatchForm />
      </div>
    </main>
  );
}
