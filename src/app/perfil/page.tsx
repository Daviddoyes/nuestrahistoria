'use client'

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getPerfil, seguirUsuario, dejarDeSeguir } from '@/lib/actions'
import AppShell, { PantallaCargando, EstadoVacio } from '@/components/AppShell'
import ListaUsuariosModal from '@/components/ListaUsuariosModal'
import EditarPerfilModal from '@/components/EditarPerfilModal'
import PostDetailModal from '@/components/PostDetailModal'
import BuscarUsuariosSheet from '@/components/BuscarUsuariosSheet'
import InvitarAmigoSheet from '@/components/InvitarAmigoSheet'
import CompletarGooalModal, { type ResultadoCompletado } from '@/components/CompletarGooalModal'
import CelebracionPuntos from '@/components/CelebracionPuntos'
import CabeceraPerfil from '@/components/perfil/CabeceraPerfil'
import TarjetaEnComun from '@/components/perfil/TarjetaEnComun'
import TarjetaCifras from '@/components/perfil/TarjetaCifras'
import PastillasCategorias from '@/components/perfil/PastillasCategorias'
import PestanasPerfil, { type PestanaPerfil } from '@/components/perfil/PestanasPerfil'
import RejillaConquistados from '@/components/perfil/RejillaConquistados'
import ListaPendientes from '@/components/perfil/ListaPendientes'
import VisorLogro from '@/components/perfil/VisorLogro'
import AjustesSheet from '@/components/perfil/AjustesSheet'
import type { Conquistado, GooalResumen, PerfilCompleto } from '@/types/gooals'

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

  const [perfil, setPerfil] = useState<PerfilCompleto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [siguiendoAccion, setSiguiendoAccion] = useState(false)
  const [pestana, setPestana] = useState<PestanaPerfil>('conquistados')

  const [lista, setLista] = useState<'seguidores' | 'siguiendo' | null>(null)
  const [ajustes, setAjustes] = useState(false)
  const [editando, setEditando] = useState(false)
  const [postAbierto, setPostAbierto] = useState<string | null>(null)
  const [visor, setVisor] = useState<Conquistado | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [invitando, setInvitando] = useState(false)
  const [completando, setCompletando] = useState<GooalResumen | null>(null)
  const [celebracion, setCelebracion] = useState<ResultadoCompletado | null>(null)

  const pestanasRef = useRef<HTMLDivElement>(null)

  /**
   * `silencioso` recarga sin pantalla de carga ni cambiar de pestaña: tras
   * completar un gooal o fallar un "Seguir", la página no debe parpadear. Al
   * entrar en un perfil (o saltar a otro) sí: si no, se verían un instante los
   * datos del anterior.
   */
  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) {
      setLoading(true)
      setPestana('conquistados')
    }
    try {
      const p = await getPerfil(username ?? undefined)
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
      await cargar(true)
    }
    setSiguiendoAccion(false)
  }

  const irAPerfil = (u: string | null) => {
    setLista(null)
    setBuscando(false)
    setPostAbierto(null)
    if (!u) return
    if (perfil?.esPropio && u === perfil.usuario.username) return
    router.push(`/perfil?u=${encodeURIComponent(u)}`)
  }

  // Sin post en el muro (falló al publicarse) se abre la prueba en un visor
  // simple: el recuerdo está en user_gooals igualmente.
  const abrirConquistado = (c: Conquistado) => {
    if (c.postId) setPostAbierto(c.postId)
    else setVisor(c)
  }

  const verPendientes = () => {
    setPestana('pendientes')
    pestanasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleCompletado = async (resultado: ResultadoCompletado) => {
    setCompletando(null)
    setCelebracion(resultado)
    setPestana('conquistados')
    await cargar(true)
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
              className="px-5 py-3 rounded-xl bg-[#00D1A7] active:bg-[#00B893] text-[#0B0B0B] text-sm font-semibold transition-colors min-h-[44px]"
            >
              Volver a mi perfil
            </button>
          }
        />
      </AppShell>
    )
  }

  const botonExplorar = (
    <button
      onClick={() => router.push('/explorar')}
      className="px-5 py-3 rounded-xl bg-[#00D1A7] active:bg-[#00B893] text-[#0B0B0B] text-sm font-semibold transition-colors min-h-[44px]"
    >
      Explorar gooals
    </button>
  )

  return (
    <>
      <AppShell tab="perfil" fotoPerfil={perfil.esPropio ? perfil.usuario.foto_perfil_url : null}>
        <div style={{ padding: '0 20px 32px' }}>

          {/* ── Barra superior ─────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', minHeight: 44 }}>
            {perfil.esPropio ? (
              <button
                onClick={() => setBuscando(true)}
                aria-label="Buscar personas"
                className="text-[#7A8A85] active:text-[#00D1A7] transition-colors w-11 h-11 -ml-3 flex items-center justify-center"
              >
                <Search className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => router.push('/perfil')}
                aria-label="Volver a mi perfil"
                className="text-[#7A8A85] active:text-[#00D1A7] transition-colors w-11 h-11 -ml-3 flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
          </div>

          <CabeceraPerfil
            usuario={perfil.usuario}
            esPropio={perfil.esPropio}
            siguiendolo={perfil.siguiendolo}
            seguidores={perfil.seguidores}
            siguiendo={perfil.siguiendo}
            siguiendoAccion={siguiendoAccion}
            onSeguir={handleSeguir}
            onAjustes={() => setAjustes(true)}
            onLista={setLista}
          />

          {error && (
            <p role="alert" className="text-sm text-[#FF5252] bg-[rgba(255,82,82,0.14)] px-3 py-2 rounded-lg mt-4">{error}</p>
          )}

          {/* Lo que os une va lo primero tras la cabecera: es lo primero que se ve de alguien. */}
          {perfil.enComun && (
            <div style={{ marginTop: 18 }}>
              <TarjetaEnComun enComun={perfil.enComun} onVerPendientes={verPendientes} />
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <TarjetaCifras conquistados={perfil.conquistados.length} puntos={perfil.puntos} />
          </div>

          <div style={{ marginTop: 14 }}>
            <PastillasCategorias conteos={perfil.porCategoria} />
          </div>

          <div ref={pestanasRef} style={{ marginTop: 20, scrollMarginTop: 8 }}>
            <PestanasPerfil
              activa={pestana}
              conquistados={perfil.conquistados.length}
              pendientes={perfil.pendientes.length}
              onCambiar={setPestana}
            />
          </div>

          <div role="tabpanel" style={{ paddingTop: pestana === 'conquistados' ? 2 : 0 }}>
            {pestana === 'conquistados' ? (
              perfil.conquistados.length === 0 ? (
                <EstadoVacio
                  titulo={perfil.esPropio ? 'Aún no has conquistado ningún gooal.' : 'Todavía no ha conquistado ningún gooal.'}
                  texto={perfil.esPropio ? 'Elige uno, vívelo y sube la prueba.' : undefined}
                  accion={perfil.esPropio ? botonExplorar : undefined}
                />
              ) : (
                <RejillaConquistados conquistados={perfil.conquistados} onAbrir={abrirConquistado} />
              )
            ) : perfil.pendientes.length === 0 ? (
              <EstadoVacio
                titulo={perfil.esPropio ? 'Tu lista de pendientes está vacía.' : 'No tiene gooals pendientes.'}
                texto={perfil.esPropio ? 'Añade los que quieras vivir desde Explorar.' : undefined}
                accion={perfil.esPropio ? botonExplorar : undefined}
              />
            ) : (
              <ListaPendientes
                pendientes={perfil.pendientes}
                onYaLoHice={perfil.esPropio ? setCompletando : undefined}
              />
            )}
          </div>
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

      {ajustes && (
        <AjustesSheet
          perfil={perfil}
          onClose={() => setAjustes(false)}
          onEditar={() => { setAjustes(false); setEditando(true) }}
          onInvitar={() => { setAjustes(false); setInvitando(true) }}
          onCerrarSesion={handleLogout}
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

      {visor && <VisorLogro conquistado={visor} onClose={() => setVisor(null)} />}

      {buscando && (
        <BuscarUsuariosSheet
          onClose={() => setBuscando(false)}
          onUsuarioClick={irAPerfil}
        />
      )}

      {invitando && <InvitarAmigoSheet onClose={() => setInvitando(false)} />}

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
