'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Logotipo from '@/components/Logotipo'

// En Next 16 `params` es una promesa también en Client Components: hay que
// leerla con `use()`, la firma síncrona de la v14 ya no compila.
export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()

  useEffect(() => {
    // El token sobrevive al registro (que pasa por email/OAuth) gracias a
    // localStorage; el query param es solo para que la home lo vea al vuelo.
    try {
      localStorage.setItem('invite_token', token)
    } catch {
      // Safari en modo privado puede tirar QuotaExceededError: seguimos igual,
      // el token va en la URL.
    }
    router.replace(`/?invite=${encodeURIComponent(token)}`)
  }, [token, router])

  return (
    <div style={{
      background: '#0B0B0B', minHeight: '100vh',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexDirection: 'column',
      gap: 16, padding: 32,
    }}>
      <Logotipo alto={24} />
      <h1 style={{
        color: '#FFFFFF', fontSize: 24,
        fontWeight: 700, textAlign: 'center',
      }}>
        Te esperamos dentro.
      </h1>
      <p style={{ color: '#7A8A85', fontSize: 15, textAlign: 'center' }}>
        Redirigiendo...
      </p>
    </div>
  )
}
