'use client'

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, LogOut, Search, UserPlus, ListTodo, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  getPerfilGamificado, seguirUsuario, dejarDeSeguir,
} from '@/lib/actions'
import { progresoNivel } from '@/lib/niveles'
import { CATEGORIA_EMOJI, CATEGORIA_LABEL } from '@/lib/gooals'
import AppShell, { PantallaCargando, EstadoVacio } from '@/components/AppShell'
import Avatar from '@/components/Avatar'
import ListaUsuariosModal from '@/components/ListaUsuariosModal'
import EditarPerfilModal from '@/components/EditarPerfilModal'
import CompartirPerfilStory from '@/components/CompartirPerfilStory'
import PostDetailModal from '@/components/PostDetailModal'
import BuscarUsuariosSheet from '@/components/BuscarUsuariosSheet'
import InvitarAmigoSheet from '@/components/InvitarAmigoSheet'
import type { PerfilGamificado } from '@/types/gooals'

export default function PerfilPage() {
  // useSearchParams obliga a un límite de Suspense para poder prerenderizar.
  return (
    <Suspense fallback={<PantallaCargando />}>
      <PerfilContenido />
    </Suspense>
  )
}

function PerfilContenido() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  // ?u=<username> abre el perfil de otra persona; sin parámetro, el propio.
  const username = searchParams.get('u')

  const [perfil, setPerfil] = useState<PerfilGamificado | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [siguiendoAccion, setSiguiendoAccion] = useState(false)

  const [lista, setLista] = useState<'seguidores' | 'siguiendo' | null>(null)
  const [editando, setEditando] = useState(false)
  const [postAbierto, setPostAbierto] = useState<string | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [invitando, setInvitando] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const p = await getPerfilGamificado(username ?? undefined)
      if (!p) {
        if (username) setError('No existe ningún perfil con ese usuario.')
        else router.push('/')
        return
      }
      setPerfil(p)
      setError('')
    } catch (e) {
      console.error('[perfil]', e)
      setError('No hemos podido cargar el perfil. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [username, router])

  useEffect(() => { cargar() }, [cargar])

  const handleSeguir = async () => {
    if (!perfil) return
    setSiguiendoAccion(true)
    // Optimista: el número y el botón se corrigen al recargar si algo falla.
    const seguiaAntes = perfil.siguiendolo
    setPerfil(p => p && ({
      ...p,
      siguiendolo: !seguiaAntes,
      seguidores: p.seguidores + (seguiaAntes ? -1 : 1),
    }))

    const res = seguiaAntes
      ? await dejarDeSeguir(perfil.usuario.id)
      : await seguirUsuario(perfil.usuario.id)

    if (!res.success) {
      setError(res.error ?? 'No se pudo completar la acción.')
      await cargar()
    }
    setSiguiendoAccion(false)
  }

  const irAPerfil = (u: string | null) => {
    setLista(null)
    setBuscando(false)
    if (!u) return
    if (perfil?.esPropio && u === perfil.usuario.username) return
    router.push(`/perfil?u=${encodeURIComponent(u)}`)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return <PantallaCargando />

  if (!perfil) {
    return (
      <AppShell tab="perfil">
        <EstadoVacio
          titulo={error || 'Perfil no encontrado.'}
          accion={
            <button
              onClick={() => router.push('/perfil')}
              className="px-5 py-3 rounded-xl bg-[#1DE9B6] active:bg-[#00BFA5] text-[#0A0A0A] text-sm font-semibold transition-colors min-h-[44px]"
            >
              Volver a mi perfil
            </button>
          }
        />
      </AppShell>
    )
  }

  const progreso = progresoNivel(perfil.puntos)
  const nivel = progreso.actual

  return (
    <>
      <AppShell tab="perfil" fotoPerfil={perfil.esPropio ? perfil.usuario.foto_perfil_url : null}>
        <div style={{ padding: '0 20px 32px' }}>

          {/* ── Barra superior ─────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
            {perfil.esPropio ? (
              <button
                onClick={() => setBuscando(true)}
                aria-label="Buscar personas"
                className="text-[#666666] active:text-[#1DE9B6] transition-colors p-2 -ml-2"
              >
                <Search className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => router.push('/perfil')}
                aria-label="Volver a mi perfil"
                className="text-[#666666] active:text-[#1DE9B6] transition-colors p-2 -ml-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            {perfil.esPropio && (
              <button
                onClick={() => router.push('/planes')}
                aria-label="Mis planes"
                className="text-[#666666] active:text-[#1DE9B6] transition-colors p-2 -mr-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em]"
              >
                <ListTodo className="w-4 h-4" /> Planes
              </button>
            )}
          </div>

          {/* ── Cabecera ───────────────────────────────────── */}
          <div className="flex flex-col items-center" style={{ paddingTop: 8 }}>
            <Avatar
              nombre={perfil.usuario.nombre}
              foto={perfil.usuario.foto_perfil_url}
              size={80}
              borde={nivel.color}
            />

            <p style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F0', marginTop: 14, textAlign: 'center', lineHeight: 1.2 }}>
              {perfil.usuario.nombre}
            </p>
            <p style={{ fontSize: 13, color: '#666666', marginTop: 4 }}>
              @{perfil.usuario.username ?? perfil.usuario.nombre}
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1DE9B6', marginTop: 8 }}>
              Nivel: {nivel.nombre}
            </p>

            {!perfil.esPropio && (
              <button
                onClick={handleSeguir}
                disabled={siguiendoAccion}
                className={`mt-5 px-8 py-3 rounded-xl text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${
                  perfil.siguiendolo
                    ? 'border border-[#2A2A2A] text-[#F0F0F0] active:bg-[#141414]'
                    : 'bg-[#1DE9B6] active:bg-[#00BFA5] text-[#0A0A0A]'
                }`}
              >
                {perfil.siguiendolo ? <><Check className="w-4 h-4" /> Siguiendo</> : 'Seguir'}
              </button>
            )}
          </div>

          {/* ── Puntos y nivel ─────────────────────────────── */}
          <div style={{ background: '#141414', borderRadius: 16, padding: 18, marginTop: 26 }}>
            <p style={{ fontSize: 36, fontWeight: 700, color: '#1DE9B6', lineHeight: 1 }}>
              {perfil.puntos} pts
            </p>

            <div
              role="progressbar"
              aria-valuenow={progreso.porcentaje}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progreso al siguiente nivel"
              style={{ height: 10, background: '#1A1A1A', borderRadius: 999, overflow: 'hidden', marginTop: 14 }}
            >
              <div
                className="barra-nivel"
                style={{ height: '100%', width: `${progreso.porcentaje}%`, background: '#1DE9B6', borderRadius: 999 }}
              />
            </div>

            <p style={{ fontSize: 12, color: '#666666', marginTop: 9 }}>
              {progreso.siguiente
                ? `${perfil.puntos}/${progreso.siguiente.minPuntos} para ${progreso.siguiente.nombre}`
                : 'Nivel máximo alcanzado. Eres épico.'}
            </p>
          </div>

          {/* ── Estadísticas por categoría ─────────────────── */}
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#666666', marginTop: 28, marginBottom: 12 }}>
            Por categoría
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {perfil.stats.map(s => (
              <div
                key={s.categoria}
                style={{
                  background: '#141414', borderRadius: 12, padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1 }}>{CATEGORIA_EMOJI[s.categoria]}</span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 12, color: '#C0C0C0', lineHeight: 1.3 }}>
                    {CATEGORIA_LABEL[s.categoria]}
                  </span>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1DE9B6', lineHeight: 1.3 }}>
                    {s.porcentaje}%
                  </span>
                </span>
              </div>
            ))}
          </div>

          {/* ── Stats sociales ─────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 26 }}>
            <button
              onClick={() => setLista('seguidores')}
              className="active:text-[#1DE9B6] transition-colors"
              style={{ fontSize: 13, color: '#888888', minHeight: 44, padding: '0 4px' }}
            >
              <span style={{ color: '#F0F0F0', fontWeight: 700 }}>{perfil.seguidores}</span> seguidores
            </button>
            <span style={{ color: '#333333' }}>·</span>
            <button
              onClick={() => setLista('siguiendo')}
              className="active:text-[#1DE9B6] transition-colors"
              style={{ fontSize: 13, color: '#888888', minHeight: 44, padding: '0 4px' }}
            >
              <span style={{ color: '#F0F0F0', fontWeight: 700 }}>{perfil.siguiendo}</span> siguiendo
            </button>
          </div>

          {/* ── Gooals completados ─────────────────────────── */}
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#666666', marginTop: 14, marginBottom: 12 }}>
            Gooals completados
          </p>

          {perfil.recientes.length === 0 ? (
            <p style={{ fontSize: 13, color: '#444444', textAlign: 'center', padding: '12px 0 4px' }}>
              {perfil.esPropio
                ? 'Completa tu primer gooal para verlo aquí.'
                : 'Todavía no ha completado ningún gooal.'}
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
              {perfil.recientes.map(r => (
                <button
                  key={r.userGooalId}
                  onClick={() => r.postId && setPostAbierto(r.postId)}
                  disabled={!r.postId}
                  className="active:opacity-70 transition-opacity"
                  style={{
                    position: 'relative', aspectRatio: '1/1', borderRadius: 8,
                    overflow: 'hidden', background: '#141414', display: 'block', width: '100%',
                  }}
                >
                  {r.foto_url && (
                    <img
                      src={r.foto_url}
                      alt={r.titulo}
                      loading="lazy"
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                  <span
                    style={{
                      position: 'absolute', bottom: 4, right: 5, fontSize: 10, fontWeight: 700,
                      color: '#1DE9B6', background: 'rgba(0,0,0,0.6)', borderRadius: 5, padding: '1px 5px',
                    }}
                  >
                    +{r.puntos}
                  </span>
                </button>
              ))}
            </div>
          )}


          {/* ── Acciones ───────────────────────────────────── */}
          {perfil.esPropio && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 28 }}>
              <button
                onClick={() => setEditando(true)}
                className="w-full py-3.5 rounded-xl bg-[#1DE9B6] active:bg-[#00BFA5] text-[#0A0A0A] transition-colors text-sm font-semibold min-h-[44px]"
              >
                Editar perfil
              </button>

              <CompartirPerfilStory perfil={perfil} />

              <button
                onClick={() => setInvitando(true)}
                className="w-full py-3 flex items-center justify-center gap-2 text-[13px] text-[#1DE9B6] active:text-[#00BFA5] transition-colors min-h-[44px]"
              >
                <UserPlus className="w-3.5 h-3.5" /> Invitar a un amigo
              </button>

              <button
                onClick={handleLogout}
                className="w-full py-3 flex items-center justify-center gap-2 text-[13px] text-[#666666] active:text-[#C97B7B] transition-colors min-h-[44px]"
              >
                <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
              </button>
            </div>
          )}

          {error && (
            <p className="text-sm text-[#C97B7B] bg-[#8B3A3A]/20 px-3 py-2 rounded-lg mt-4">{error}</p>
          )}
        </div>
      </AppShell>

      {/* ── Modales ──────────────────────────────────────── */}
      {lista && (
        <ListaUsuariosModal
          userId={perfil.usuario.id}
          tipo={lista}
          onClose={() => setLista(null)}
          onUsuarioClick={irAPerfil}
        />
      )}

      {editando && (
        <EditarPerfilModal
          userId={perfil.usuario.id}
          nombreActual={perfil.usuario.nombre}
          fotoActual={perfil.usuario.foto_perfil_url}
          onClose={() => setEditando(false)}
          onGuardado={cambios => {
            setPerfil(p => p && ({ ...p, usuario: { ...p.usuario, ...cambios } }))
            setEditando(false)
          }}
        />
      )}

      {postAbierto && (
        <PostDetailModal
          postId={postAbierto}
          onClose={() => setPostAbierto(null)}
          onAutorClick={irAPerfil}
        />
      )}

      {buscando && (
        <BuscarUsuariosSheet
          onClose={() => setBuscando(false)}
          onUsuarioClick={irAPerfil}
        />
      )}

      {invitando && <InvitarAmigoSheet onClose={() => setInvitando(false)} />}
    </>
  )
}

