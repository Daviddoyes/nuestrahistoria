'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getMuroFeed, getMyProfile, sigoAAlguien } from '@/lib/actions'
import AppShell, { PantallaCargando, EstadoVacio } from '@/components/AppShell'
import MuroPostCard from '@/components/MuroPostCard'
import { ProveedorFotosPrivadas } from '@/components/FotosPrivadas'
import type { MuroPostFeed, Profile } from '@/types/gooals'

export default function MuroPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<MuroPostFeed[]>([])
  const [sigueAAlguien, setSigueAAlguien] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    try {
      const [prof, feed, sigue] = await Promise.all([getMyProfile(), getMuroFeed(), sigoAAlguien()])
      if (!prof) { router.push('/'); return }
      setProfile(prof)
      setPosts(feed)
      setSigueAAlguien(sigue)
    } catch (e) {
      console.error('[muro]', e)
      setError('No hemos podido cargar el muro. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { cargar() }, [cargar])

  if (loading) return <PantallaCargando />
  if (!profile) return null

  return (
    <ProveedorFotosPrivadas>
    <AppShell tab="muro" fotoPerfil={profile.foto_perfil_url}>
      <div style={{ padding: '10px 12px 24px' }}>
        {error && (
          <p className="text-sm text-[#FF5252] bg-[rgba(255,82,82,0.14)] px-3 py-2 rounded-lg mb-3">{error}</p>
        )}

        {posts.length === 0 && !error ? (
          // El motivo real, que no siempre es el mismo: el muro son tus posts
          // MÁS los de quien sigues. Antes decía siempre «aún no sigues a nadie»,
          // y eso era falso para quien ya sigue gente que todavía no ha subido
          // nada — que hoy es casi todo el mundo.
          <EstadoVacio
            titulo={sigueAAlguien ? 'Todavía no hay nada publicado.' : 'Tu muro está vacío.'}
            texto={sigueAAlguien
              ? 'Aquí aparecerá cada gooal que consigáis tú o la gente a la que sigues. Sé el primero.'
              : 'Aquí aparece cada gooal que consigues tú, y los de la gente a la que sigas.'}
            accion={
              <button
                onClick={() => router.push('/explorar')}
                className="px-5 py-3 rounded-xl bg-[#00D1A7] active:bg-[#00B893] text-[#0B0B0B] text-sm font-semibold transition-colors min-h-[44px]"
              >
                Explorar gooals
              </button>
            }
          />
        ) : (
          posts.map(post => (
            <MuroPostCard
              key={post.id}
              post={post}
              onAutorClick={username => {
                if (!username) return
                if (username === profile.username) router.push('/perfil')
                else router.push(`/perfil?u=${encodeURIComponent(username)}`)
              }}
            />
          ))
        )}
      </div>
    </AppShell>
    </ProveedorFotosPrivadas>
  )
}
