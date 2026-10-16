/**
 * Fondo ambiental del login — orbes de brillo (mismo enfoque que Portal).
 */
export default function LoginAmbient() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
    >
      <div
        className="absolute -left-24 bottom-[-10%] h-56 w-56 rounded-full opacity-25 blur-3xl motion-safe:animate-float"
        style={{
          background: "radial-gradient(circle, var(--accent), transparent 70%)",
        }}
      />
      <div
        className="absolute -right-12 top-1/3 h-48 w-48 rounded-full opacity-20 blur-3xl motion-safe:animate-float"
        style={{
          background:
            "radial-gradient(circle, var(--accent-hover), transparent 70%)",
          animationDelay: "1.4s",
        }}
      />
      <div
        className="absolute left-1/2 top-[8%] h-40 w-40 -translate-x-1/2 rounded-full opacity-15 blur-3xl motion-safe:animate-float"
        style={{
          background: "radial-gradient(circle, var(--accent), transparent 72%)",
          animationDelay: "0.7s",
        }}
      />
    </div>
  );
}
