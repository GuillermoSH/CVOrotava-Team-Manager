import type { AllowedEmailRow } from "@/lib/auth/allowedEmails";
import {
  isInactiveAccess,
  isRegisteredAccess,
} from "@/lib/auth/allowedEmails";

export type AccessGroupBy = "status" | "activity" | "role" | "gender" | "none";

export const ACCESS_GROUP_OPTIONS: {
  value: AccessGroupBy;
  label: string;
}[] = [
  { value: "status", label: "Cuenta" },
  { value: "activity", label: "Actividad" },
  { value: "role", label: "Rol" },
  { value: "gender", label: "Género" },
  { value: "none", label: "Lista" },
];

export type AccessGroup = {
  key: string;
  label: string;
  hint?: string;
  rows: AllowedEmailRow[];
};

export function roleLabel(role: AllowedEmailRow["role"]): string | null {
  if (role === "admin") return "Admin";
  if (role === "coach") return "Entrenador";
  if (role === "player") return "Jugador";
  return null;
}

export function genderLabel(gender: AllowedEmailRow["gender"]): string | null {
  if (gender === "male") return "Masculino";
  if (gender === "female") return "Femenino";
  return null;
}

export function formatAdded(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Relative last login for scan; full datetime for `title`. */
export function formatLastSignIn(iso: string | null): {
  label: string;
  title: string | undefined;
} {
  if (!iso) {
    return { label: "Sin entradas", title: undefined };
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { label: "Sin entradas", title: undefined };
  }

  const title = d.toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfThat = new Date(d);
  startOfThat.setHours(0, 0, 0, 0);
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfThat.getTime()) / 86_400_000
  );

  if (dayDiff === 0) return { label: "Hoy", title };
  if (dayDiff === 1) return { label: "Ayer", title };
  if (dayDiff > 1 && dayDiff < 7) {
    return { label: `Hace ${dayDiff} días`, title };
  }
  if (dayDiff >= 7 && dayDiff < 30) {
    const weeks = Math.floor(dayDiff / 7);
    return {
      label: weeks === 1 ? "Hace 1 semana" : `Hace ${weeks} semanas`,
      title,
    };
  }

  return {
    label: d.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    title,
  };
}

function sortRows(rows: AllowedEmailRow[]): AllowedEmailRow[] {
  return [...rows].sort((a, b) => {
    const aReg = isRegisteredAccess(a) ? 1 : 0;
    const bReg = isRegisteredAccess(b) ? 1 : 0;
    if (aReg !== bReg) return bReg - aReg;

    const aLogin = a.last_sign_in_at ? Date.parse(a.last_sign_in_at) : 0;
    const bLogin = b.last_sign_in_at ? Date.parse(b.last_sign_in_at) : 0;
    if (aLogin !== bLogin) return bLogin - aLogin;

    const aName = (a.user_name ?? a.email).toLowerCase();
    const bName = (b.user_name ?? b.email).toLowerCase();
    return aName.localeCompare(bName, "es");
  });
}

export function groupAccessRows(
  rows: AllowedEmailRow[],
  groupBy: AccessGroupBy
): AccessGroup[] {
  const sorted = sortRows(rows);

  if (groupBy === "none") {
    return [{ key: "all", label: "Todos", rows: sorted }];
  }

  if (groupBy === "status") {
    const registered = sorted.filter(isRegisteredAccess);
    const pending = sorted.filter((r) => !isRegisteredAccess(r));
    return [
      {
        key: "registered",
        label: "Con cuenta",
        hint: "Ya han entrado con Google",
        rows: registered,
      },
      {
        key: "pending",
        label: "Pendientes",
        hint: "En la lista, aún no han iniciado sesión",
        rows: pending,
      },
    ].filter((g) => g.rows.length > 0);
  }

  if (groupBy === "activity") {
    const active = sorted.filter(
      (r) => isRegisteredAccess(r) && r.is_active !== false
    );
    const inactive = sorted.filter(isInactiveAccess);
    const pending = sorted.filter((r) => !isRegisteredAccess(r));
    return [
      {
        key: "active",
        label: "Activos",
        hint: "Acceso completo al panel",
        rows: active,
      },
      {
        key: "inactive",
        label: "Inactivos",
        hint: "Solo pueden ver sus pagos",
        rows: inactive,
      },
      {
        key: "pending",
        label: "Pendientes",
        hint: "Aún no han iniciado sesión",
        rows: pending,
      },
    ].filter((g) => g.rows.length > 0);
  }

  if (groupBy === "role") {
    const order: Array<{
      key: string;
      label: string;
      match: (r: AllowedEmailRow) => boolean;
    }> = [
      { key: "admin", label: "Admins", match: (r) => r.role === "admin" },
      { key: "coach", label: "Entrenadores", match: (r) => r.role === "coach" },
      { key: "player", label: "Jugadores", match: (r) => r.role === "player" },
      {
        key: "unknown",
        label: "Sin rol / pendientes",
        match: (r) => !r.role,
      },
    ];
    return order
      .map((o) => ({
        key: o.key,
        label: o.label,
        rows: sorted.filter(o.match),
      }))
      .filter((g) => g.rows.length > 0);
  }

  // gender
  const order = [
    {
      key: "male",
      label: "Masculino",
      match: (r: AllowedEmailRow) => r.gender === "male",
    },
    {
      key: "female",
      label: "Femenino",
      match: (r: AllowedEmailRow) => r.gender === "female",
    },
    {
      key: "unknown",
      label: "Sin género / pendientes",
      match: (r: AllowedEmailRow) => !r.gender,
    },
  ];
  return order
    .map((o) => ({
      key: o.key,
      label: o.label,
      rows: sorted.filter(o.match),
    }))
    .filter((g) => g.rows.length > 0);
}
