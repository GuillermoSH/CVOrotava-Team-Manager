'use client';

import { supabase } from '@/lib/supabaseClient';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  // Si ya hay sesión, redirigimos al home protegido
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.push('/'); // o "/protected" si prefieres
      }
    };

    checkSession();
  }, [router]);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`, // vuelve al home después del login
      },
    });
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">Bienvenido</h1>
        <p className="text-gray-600 mb-6">
          Inicia sesión con tu cuenta de Google
        </p>
        <button
          onClick={handleLogin}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition w-full"
        >
          <img
            src="/google-icon.svg"
            alt="Google"
            className="w-5 h-5"
          />
          Iniciar sesión con Google
        </button>
      </div>
    </main>
  );
}
