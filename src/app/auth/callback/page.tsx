'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) console.error(error)
      if (session) {
        console.log('Usuario logueado:', session.user)
        router.push('/') // redirige al home
      }
    }
    handleSession()
  }, [router])

  return <p>Procesando login...</p>
}
