import Bone from "@/components/common/Bone";
import PageHeader from "@/components/ui/PageHeader";

export default function ContactsLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando contactos"
      className="flex w-full flex-col text-[var(--text-primary)]"
    >
      <PageHeader title="Contactos" subtitle="Teléfono y correo de las familias por equipo" />
      <Bone className="mb-6 h-11 w-full max-w-sm rounded-xl" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Bone key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
