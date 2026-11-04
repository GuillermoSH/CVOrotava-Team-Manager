import type { ReactNode } from "react";
import BetaNotice from "@/components/competition/BetaNotice";

/** El aviso de beta va arriba del todo, encima del título, en todas las pantallas de Jornadas. */
export default function JornadasLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <BetaNotice />
      {children}
    </>
  );
}
