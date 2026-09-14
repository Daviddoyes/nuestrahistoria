'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getMuroFeed, getMyProfile } from '@/lib/actions'
import AppShell, { PantallaCargando, EstadoVacio } from '@/components/AppShell'
import MuroPostCard from '@/components/MuroPostCard'
import type { MuroPostFeed, Profile } from '@/types/gooals'

export default function MuroPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<MuroPostFeed[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    try {
      const [prof, feed] = await Promise.all([getMyProfile(), getMuroFeed()])
      if (!prof) { router.push('/'); return }
      setProfile(prof)
      setPosts(feed)
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
    <AppShell tab="muro" fotoPerfil={profile.foto_perfil_url}>
      <div style={{ padding: '10px 12px 24px' }}>
        {error && (
          <p className="text-sm text-[#FF5252] bg-[rgba(255,82,82,0.14)] px-3 py-2 rounded-lg mb-3">{error}</p>
        )}

        {posts.length === 0 && !error ? (
          <EstadoVacio
            titulo="Aún no sigues a nadie."
            texto="Explora gooals y conecta con personas."
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
  )
}
