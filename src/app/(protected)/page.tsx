export default function ProtectedHome() {
  const cards = [
    {
      title: "Videos de Partidos",
      description: "Accede a la lista de partidos grabados.",
      href: "/protected/partidos",
    },
    {
      title: "Videos de Entrenamientos",
      description: "Consulta las sesiones de entrenamiento disponibles.",
      href: "/protected/entrenamientos",
    },
    {
      title: "Próximamente",
      description: "Nuevas funcionalidades estarán disponibles aquí.",
      href: "#",
    },
  ];

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Bienvenido a tu Panel
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
        {cards.map((card, idx) => (
          <a
            key={idx}
            href={card.href}
            className="bg-white shadow-md rounded-2xl p-6 flex flex-col justify-between hover:shadow-lg transition"
          >
            <h2 className="text-xl font-semibold mb-2">{card.title}</h2>
            <p className="text-gray-600 flex-1">{card.description}</p>
            <span className="mt-4 inline-block px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition">
              Entrar
            </span>
          </a>
        ))}
      </div>
    </main>
  );
}
