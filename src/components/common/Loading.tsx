"use client";

export default function Loading() {
  return (
    <main className="flex-1 flex justify-center items-center">
      <div className="flex flex-col items-center gap-4">
        {/* Animated spinner */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/5" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--accent)] animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-red-400/50 animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.8s" }} />
        </div>
        <p className="text-xs text-[var(--text-muted)] animate-pulse">Cargando...</p>
      </div>
    </main>
  );
}
