'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getMyProfile } from '@/lib/actions'
import AppShell, { PantallaCargando } from '@/components/AppShell'
import ExplorarFeed from '@/components/ExplorarFeed'
import CelebracionPuntos from '@/components/CelebracionPuntos'
import type { ResultadoCompletado } from '@/components/CompletarGooalModal'
import type { Profile } from '@/types/planes'

export default function ExplorarPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [celebracion, setCelebracion] = useState<ResultadoCompletado | null>(null)

  useEffect(() => {
    getMyProfile()
      .then(prof => {
        if (!prof) { router.push('/'); return }
        setProfile(prof)
      })
      .catch(e => console.error('[explorar]', e))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) return <PantallaCargando />
  if (!profile) return null

  return (
    <>
      <AppShell tab="explorar" fotoPerfil={profile.foto_perfil_url}>
        <ExplorarFeed onCompletado={setCelebracion} />
      </AppShell>

      {celebracion && (
        <CelebracionPuntos resultado={celebracion} onClose={() => setCelebracion(null)} />
      )}
    </>
  )
}
