// src/app/(protected)/layout.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Loading from "@/components/common/Loading";
import Navbar from "@/components/layout/Navbar";

export default function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      } else {
        setLoading(false);
      }
    };

    checkSession();
  }, [router]);

  if (loading) return <Loading />;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[url(/assets/svgs/circle-scatter-RB-shape.svg)] bg-center bg-cover bg-fixed pt-16 pb-6 px-3 md:px-6 flex justify-center">
        {children}
      </div>
    </>
  );
}
