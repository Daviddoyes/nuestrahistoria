'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
      background: '#0A0A0A', minHeight: '100vh',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexDirection: 'column',
      gap: 16, padding: 32,
    }}>
      <p style={{
        color: '#1DE9B6', fontSize: 11,
        letterSpacing: '0.2em', textTransform: 'uppercase',
      }}>
        GooALS
      </p>
      <h1 style={{
        color: '#F0F0F0', fontSize: 24,
        fontWeight: 700, textAlign: 'center',
      }}>
        Te esperamos dentro.
      </h1>
      <p style={{ color: '#666', fontSize: 15, textAlign: 'center' }}>
        Redirigiendo...
      </p>
    </div>
  )
}
