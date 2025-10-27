"use client";

import Navbar from "@/components/layout/Navbar";
import Loading from "@/components/common/Loading";
import { UserProvider, useUser } from "@/contexts/UserContext";
import { SeasonProvider } from "@/contexts/SeasonContext";

function ProtectedContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();

  if (loading) return <Loading />;
  if (!user)
    return <p className="text-center mt-10 text-red-500">No autorizado</p>;

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
