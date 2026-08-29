'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getMisGooals, getMyProfile } from '@/lib/actions'
import { CATEGORIA_LABEL, CATEGORIA_GRADIENTE, DIFICULTAD_META } from '@/lib/gooals'
import AppShell, { PantallaCargando, EstadoVacio } from '@/components/AppShell'
import CompletarGooalModal, { type ResultadoCompletado } from '@/components/CompletarGooalModal'
import CelebracionPuntos from '@/components/CelebracionPuntos'
import type { UserGooalConGooal, GooalV2 } from '@/types/gooals'
import type { Profile } from '@/types/planes'

type Seccion = 'pendientes' | 'completados'

export default function MisGooalsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [pendientes, setPendientes] = useState<UserGooalConGooal[]>([])
  const [completados, setCompletados] = useState<UserGooalConGooal[]>([])
  const [seccion, setSeccion] = useState<Seccion>('pendientes')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [completando, setCompletando] = useState<GooalV2 | null>(null)
  const [celebracion, setCelebracion] = useState<ResultadoCompletado | null>(null)

  const cargar = useCallback(async () => {
    try {
      const [prof, mios] = await Promise.all([getMyProfile(), getMisGooals()])
      if (!prof) { router.push('/'); return }
      setProfile(prof)
      setPendientes(mios.pendientes)
      setCompletados(mios.completados)
      setError('')
    } catch (e) {
      console.error('[mis-gooals]', e)
      setError('No hemos podido cargar tus gooals. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { cargar() }, [cargar])

  const handleCompletado = async (resultado: ResultadoCompletado) => {
    setCompletando(null)
    setCelebracion(resultado)
    setSeccion('completados')
    await cargar()
  }

  if (loading) return <PantallaCargando />
  if (!profile) return null

  const tabs = (
    <div className="flex gap-1 mx-3 mb-2 bg-[#141414] p-1 rounded-xl">
      {(['pendientes', 'completados'] as Seccion[]).map(s => (
        <button
          key={s}
          onClick={() => setSeccion(s)}
          aria-pressed={seccion === s}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            seccion === s ? 'bg-[#1DE9B6] text-[#0A0A0A]' : 'text-[#666666]'
          }`}
        >
          {s === 'pendientes' ? `Pendientes (${pendientes.length})` : `Completados (${completados.length})`}
        </button>
      ))}
    </div>
  )

  return (
    <>
      <AppShell tab="mis-gooals" fotoPerfil={profile.foto_perfil_url} header={tabs}>
        {error && (
          <p className="text-sm text-[#C97B7B] bg-[#8B3A3A]/20 mx-3 px-3 py-2 rounded-lg mb-3">{error}</p>
        )}

        {seccion === 'pendientes' ? (
          pendientes.length === 0 ? (
            <EstadoVacio
              titulo="No tienes gooals pendientes."
              texto="Explora el catálogo y añade el primero."
              accion={
                <button
                  onClick={() => router.push('/explorar')}
                  className="px-5 py-3 rounded-xl bg-[#1DE9B6] active:bg-[#00BFA5] text-[#0A0A0A] text-sm font-semibold transition-colors min-h-[44px]"
                >
                  Explorar gooals
                </button>
              }
            />
          ) : (
            <div style={{ padding: '0 12px 24px' }}>
              {pendientes.map(item => (
                <CardPendiente
                  key={item.id}
                  item={item}
                  onCompletar={() => setCompletando(item.gooal)}
                />
              ))}
            </div>
          )
        ) : completados.length === 0 ? (
          <EstadoVacio
            titulo="Aún no has completado ningún gooal."
            texto="Sube la prueba de uno pendiente y empieza a sumar puntos."
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 12px 24px' }}>
            {completados.map(item => <CardCompletado key={item.id} item={item} />)}
          </div>
        )}
      </AppShell>

      {completando && (
        <CompletarGooalModal
          gooal={completando}
          modo="lista"
          onClose={() => setCompletando(null)}
          onCompletado={handleCompletado}
        />
      )}

      {celebracion && (
        <CelebracionPuntos resultado={celebracion} onClose={() => setCelebracion(null)} />
      )}
    </>
  )
}

function CardPendiente({ item, onCompletar }: { item: UserGooalConGooal; onCompletar: () => void }) {
  const g = item.gooal
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: '#111111', borderRadius: 12, padding: 10, marginBottom: 8,
      }}
    >
      <div
        style={{
          width: 60, height: 60, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
          background: g.imagen_url ? '#1A1A1A' : CATEGORIA_GRADIENTE[g.categoria],
        }}
      >
        {g.imagen_url && (
          <img
            src={g.imagen_url}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14, fontWeight: 600, color: '#F0F0F0', lineHeight: 1.3,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        } as React.CSSProperties}>
          {g.titulo}
        </p>
        <p style={{ fontSize: 11, color: '#666666', marginTop: 4 }}>
          {CATEGORIA_LABEL[g.categoria]} · <span style={{ color: '#1DE9B6', fontWeight: 600 }}>+{g.puntos} pts</span>
        </p>
      </div>

      <button
        onClick={onCompletar}
        className="flex-shrink-0 px-3.5 rounded-lg bg-[#1DE9B6] active:bg-[#00BFA5] text-[#0A0A0A] text-xs font-semibold transition-colors"
        style={{ minHeight: 44 }}
      >
        Completar
      </button>
    </div>
  )
}

function CardCompletado({ item }: { item: UserGooalConGooal }) {
  const g = item.gooal
  const dificultad = DIFICULTAD_META[g.dificultad]
  const fecha = item.completado_at
    ? new Date(item.completado_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })
    : null

  return (
    <div
      style={{
        position: 'relative', aspectRatio: '3/4', borderRadius: 14, overflow: 'hidden',
        background: g.imagen_url ? '#141414' : CATEGORIA_GRADIENTE[g.categoria],
      }}
    >
      {item.video_url ? (
        <video
          src={item.video_url}
          playsInline muted loop
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (item.foto_url || g.imagen_url) ? (
        <img
          src={item.foto_url ?? g.imagen_url ?? ''}
          alt={g.titulo}
          loading="lazy"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : null}

      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 40%, rgba(0,0,0,0.88) 100%)',
        }}
      />

      <span
        style={{
          position: 'absolute', top: 8, right: 8, fontSize: 10, fontWeight: 600,
          color: dificultad.color, background: 'rgba(0,0,0,0.55)', borderRadius: 999, padding: '3px 8px',
        }}
      >
        {dificultad.emoji}
      </span>

      <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10 }}>
        <p style={{
          fontSize: 13, fontWeight: 600, color: '#FFFFFF', lineHeight: 1.25,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        } as React.CSSProperties}>
          {g.titulo}
        </p>
        <p style={{ fontSize: 11, marginTop: 5 }}>
          <span style={{ color: '#1DE9B6', fontWeight: 700 }}>+{item.puntos_ganados} pts</span>
          {fecha && <span style={{ color: '#999999' }}> · {fecha}</span>}
        </p>
      </div>
    </div>
  )
}
