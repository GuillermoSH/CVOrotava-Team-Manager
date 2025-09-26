export default function ProtectedHome() {
    const cards = [
        {
            title: "Videos de Partidos",
            description: "Accede a la lista de partidos grabados.",
            href: "/match-videos",
            disabled: false,
        },
        {
            title: "Videos de Entrenamientos",
            description: "Consulta las sesiones de entrenamiento disponibles.",
            href: "/training-videos",
            disabled: false,
        },
        {
            title: "Próximamente",
            description: "Nuevas funcionalidades estarán disponibles aquí.",
            href: "#",
            disabled: true,
        },
    ];

    return (
        <main className="min-h-screen bg-[url(/assets/svgs/circle-scatter-RB-shape.svg)] bg-center bg-cover flex flex-col items-center p-6">
            <h1 className="text-3xl text-white font-bold mb-8 text-center">
                Bienvenido a tu Panel
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
                {cards.map((card, idx) => (
                    <a
                        key={idx}
                        href={card.href}
                        className={`bg-white dark:bg-gray-300 shadow-md rounded-2xl p-6 flex flex-col justify-between transition ${card.disabled
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:shadow-lg"
                            }`}
                    >
                        <h2 className="text-xl text-gray-700 font-semibold mb-2">{card.title}</h2>
                        <p className="text-gray-600 flex-1">{card.description}</p>
                        <span
                            className={`mt-4 inline-block px-4 py-2 rounded-xl font-medium transition duration-200 ${card.disabled
                                    ? "bg-gray-400 text-gray-600"
                                    : "bg-gray-950 text-white hover:bg-gray-800"
                                }`}
                        >
                            {card.disabled ? "Deshabilitado" : "Entrar"}
                        </span>
                    </a> 
                ))}
            </div>
        </main>
    );
}
