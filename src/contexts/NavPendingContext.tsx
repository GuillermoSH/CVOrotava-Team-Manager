"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { isNavActive } from "@/components/layout/navItems";
import HomeSkeleton from "@/components/skeletons/HomeSkeleton";
import MatchesSkeleton from "@/components/skeletons/MatchesSkeleton";
import VideosSkeleton from "@/components/skeletons/VideosSkeleton";
import StatsSkeleton from "@/components/skeletons/StatsSkeleton";
import PaymentsSkeleton from "@/components/skeletons/PaymentsSkeleton";
import AccessSkeleton from "@/components/skeletons/AccessSkeleton";

type NavPendingContextValue = {
  pendingHref: string | null;
  markPending: (href: string) => void;
  isActive: (href: string) => boolean;
};

const NavPendingContext = createContext<NavPendingContextValue | null>(null);

function skeletonFor(href: string) {
  if (href === "/") return <HomeSkeleton />;
  if (href === "/matches") return <MatchesSkeleton />;
  if (href === "/videos") return <VideosSkeleton />;
  if (href === "/stats") return <StatsSkeleton />;
  if (href === "/payments") return <PaymentsSkeleton />;
  if (href === "/access") return <AccessSkeleton />;
  return null;
}

export function NavPendingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const markPending = useCallback(
    (href: string) => {
      if (href === pathname) return;
      setPendingHref(href);
    },
    [pathname]
  );

  const isActive = useCallback(
    (href: string) =>
      pendingHref != null ? pendingHref === href : isNavActive(pathname, href),
    [pendingHref, pathname]
  );

  const value = useMemo(
    () => ({ pendingHref, markPending, isActive }),
    [pendingHref, markPending, isActive]
  );

  return (
    <NavPendingContext.Provider value={value}>
      {children}
    </NavPendingContext.Provider>
  );
}

export function useNavPending() {
  const ctx = useContext(NavPendingContext);
  if (!ctx) {
    throw new Error("useNavPending must be used within NavPendingProvider");
  }
  return ctx;
}

/** Instant destination chrome while the RSC for that route is still in flight. */
export function PendingMain({ children }: { children: ReactNode }) {
  const { pendingHref } = useNavPending();
  const pending = pendingHref ? skeletonFor(pendingHref) : null;
  return pending ?? children;
}
