"use client";

import { createContext, useContext, useState, useEffect } from "react";

type UserRole = "admin" | "coach" | "player" | null;

export type AppUser = {
  id: string;
  email: string;
  user_name: string;
  gender: "male" | "female" | null;
  role: UserRole;
  isAdmin: boolean;
} | null;

type UserContextType = {
  user: AppUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
});

export function UserProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: AppUser | null;
}) {
  const [user, setUser] = useState<AppUser | null>(initialUser);
  const [loading, setLoading] = useState(!initialUser);

  // solo refresca si no se pasó user inicial
  useEffect(() => {
    if (!initialUser) {
      (async () => {
        const res = await fetch("/api/user", { cache: "no-store" });
        if (res.ok) {
          const profile = await res.json();
          setUser(profile);
        }
        setLoading(false);
      })();
    } else {
      setLoading(false);
    }
  }, [initialUser]);

  const refreshUser = async () => {
    setLoading(true);
    const res = await fetch("/api/user", { cache: "no-store" });
    const profile = await res.json();
    setUser(profile);
    setLoading(false);
  };

  return (
    <UserContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
