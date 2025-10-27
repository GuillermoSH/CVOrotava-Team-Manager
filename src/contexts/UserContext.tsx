"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type UserRole = "admin" | "coach" | "player" | null;

export type AppUser = {
  id: string;
  email: string;
  gender: "male" | "female" | null;
  role: UserRole;
  isAdmin: boolean;
} | null;

type UserContextType = {
  user: AppUser;
  loading: boolean;
  refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      try {
        // 1️⃣ Verificar sesión
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session?.user) {
          if (isMounted) setUser(null);
          return;
        }

        const { id, email = "" } = session.user;

        // 2️⃣ Obtener perfil desde nuestra API (tabla users + auth)
        const res = await fetch("/api/user", { cache: "no-store" });
        if (!res.ok) throw new Error("Error obteniendo perfil de usuario");

        const profile = await res.json();

        if (isMounted) {
          setUser({
            id,
            email,
            gender: profile.gender,
            role: profile.role,
            isAdmin: profile.role === "admin",
          });
        }
      } catch (err) {
        console.error("❌ Error cargando usuario:", err);
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUser();

    // 🧹 Cleanup para evitar fugas en React StrictMode
    return () => {
      isMounted = false;
    };
  }, []);

  // 🔄 Método para refrescar usuario manualmente (p.ej. tras editar su perfil)
  const refreshUser = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user", { cache: "no-store" });
      if (!res.ok) throw new Error("Error refrescando usuario");
      const profile = await res.json();

      setUser((prev) =>
        prev
          ? {
              ...prev,
              gender: profile.gender,
              role: profile.role,
              isAdmin: profile.role === "admin",
            }
          : prev
      );
    } catch (err) {
      console.error("Error refrescando usuario:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
