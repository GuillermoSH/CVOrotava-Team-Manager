'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        router.push('/login');
        return;
      }

      // Consultar si el email está en allowed_emails
      const { data: allowed } = await supabase
        .from('allowed_emails')
        .select('email')
        .eq('email', user.email)
        .maybeSingle();

      if (!allowed) {
        await supabase.auth.signOut();
        alert('Your account is not authorized');
        router.push('/login');
        return;
      }

      // OK → redirige al home
      router.push('/');
    };

    checkUser();
  }, [router]);

  return <p>Validating...</p>;
}
