'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getMyProfile } from '@/lib/actions'
import AppShell, { PantallaCargando } from '@/components/AppShell'
import ExplorarFeed from '@/components/ExplorarFeed'
import CelebracionPuntos from '@/components/CelebracionPuntos'
import type { ResultadoCompletado } from '@/components/AnadirFotoModal'
import type { Profile } from '@/types/gooals'

export default function ExplorarPage() {
  // useSearchParams obliga a un límite de Suspense para poder prerenderizar.
  return (
    <Suspense fallback={<PantallaCargando />}>
      <ExplorarContenido />
    </Suspense>
  )
}

function ExplorarContenido() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [celebracion, setCelebracion] = useState<ResultadoCompletado | null>(null)

  // ?q=<texto> llega del buscador de Inicio, que no busca: trae aquí lo escrito.
  const busquedaInicial = searchParams.get('q') ?? ''

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
        <ExplorarFeed onCompletado={setCelebracion} busquedaInicial={busquedaInicial} />
      </AppShell>

      {celebracion && (
        <CelebracionPuntos resultado={celebracion} onClose={() => setCelebracion(null)} />
      )}
    </>
  )
}
