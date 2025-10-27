"use client";

import Navbar from "@/components/layout/Navbar";
import Loading from "@/components/common/Loading";
import { UserProvider, useUser } from "@/contexts/UserContext";
import { SeasonProvider } from "@/contexts/SeasonContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function ProtectedContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) return <Loading />;

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[url(/assets/svgs/circle-scatter-RB-shape.svg)] bg-center bg-cover bg-fixed pt-16 pb-6 px-3 md:px-6 flex justify-center">
        {children}
      </main>
    </>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <SeasonProvider>
        <ProtectedContent>{children}</ProtectedContent>
      </SeasonProvider>
    </UserProvider>
  );
}
