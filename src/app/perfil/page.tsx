'use client'

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  getPerfil, seguirUsuario, dejarDeSeguir, getGooalDeLista, getMisEstadosGooals,
} from '@/lib/actions'
import { progresoNivel } from '@/lib/niveles'
import AppShell, { PantallaCargando, EstadoVacio } from '@/components/AppShell'
import ListaUsuariosModal from '@/components/ListaUsuariosModal'
import EditarPerfilModal from '@/components/EditarPerfilModal'
import BuscarUsuariosSheet from '@/components/BuscarUsuariosSheet'
import InvitarAmigoSheet from '@/components/InvitarAmigoSheet'
import GooalV2DetailModal from '@/components/GooalV2DetailModal'
import CelebracionPuntos from '@/components/CelebracionPuntos'
import type { ResultadoCompletado } from '@/components/AnadirFotoModal'
import CabeceraPerfil from '@/components/perfil/CabeceraPerfil'
import TarjetaCifras from '@/components/perfil/TarjetaCifras'
import PastillasCategorias from '@/components/perfil/PastillasCategorias'
import PestanasPerfil, { type PestanaPerfil } from '@/components/perfil/PestanasPerfil'
import ListaPerfil from '@/components/perfil/ListaPerfil'
import FiltroEnComun from '@/components/perfil/FiltroEnComun'
import { ProveedorFotosPrivadas } from '@/components/FotosPrivadas'
import AjustesSheet from '@/components/perfil/AjustesSheet'
import type { EstadoUserGooal, GooalV2, LineaPerfil, PerfilCompleto, VisibilidadFoto } from '@/types/gooals'

export default function PerfilPage() {
  // useSearchParams obliga a un límite de Suspense para poder prerenderizar.
  return (
    <Suspense fallback={<PantallaCargando />}>
      <PerfilContenido />
    </Suspense>
  )
}

/** Lo que hace falta para abrir la ficha de una línea de la lista. */
type FichaAbierta = {
  gooal: GooalV2
  /** La fila de esa persona, solo si su foto se puede ver. null si no. */
  logro: { userGooalId: string; quienLaVe: VisibilidadFoto | null } | null
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
  const [pestana, setPestana] = useState<PestanaPerfil>('conseguidos')
  const [soloEnComun, setSoloEnComun] = useState(false)

  const [lista, setLista] = useState<'seguidores' | 'siguiendo' | null>(null)
  const [ajustes, setAjustes] = useState(false)
  const [editando, setEditando] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [invitando, setInvitando] = useState(false)
  const [ficha, setFicha] = useState<FichaAbierta | null>(null)
  const [abriendo, setAbriendo] = useState(false)
  const [celebracion, setCelebracion] = useState<ResultadoCompletado | null>(null)

  /**
   * MIS estados, que no son los de la persona del perfil. La ficha ofrece
   * acciones ("Añadir a mi lista", "Ya lo hice") y tienen que hablar de MI
   * relación con ese gooal: abrir el conseguido de otra persona y leer "Ya lo
   * conseguiste" sería mentira.
   */
  const [misEstados, setMisEstados] = useState<Record<string, EstadoUserGooal>>({})

  /**
   * `silencioso` recarga sin pantalla de carga ni cambiar de pestaña: tras
   * conseguir un gooal o fallar un "Seguir", la página no debe parpadear. Al
   * entrar en un perfil (o saltar a otro) sí: si no, se verían un instante los
   * datos del anterior.
   */
  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) {
      setLoading(true)
      setPestana('conseguidos')
      setSoloEnComun(false)
    }
    try {
      const [p, estados] = await Promise.all([getPerfil(username ?? undefined), getMisEstadosGooals()])
      if (!p) {
        if (username) setError('No existe ningún perfil con ese usuario.')
        else router.push('/')
        return
      }
      setPerfil(p)
      setMisEstados(estados)
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

    if (!res.success) setError(res.error ?? 'No se pudo completar la acción.')

    // Se recarga también cuando va bien: seguir a alguien puede convertiros en
    // amigos (amigo = os seguís los dos) y entonces sus fotos pasan a verse. Sin
    // esto, la lista se quedaría sin sus iconitos de cámara hasta volver a entrar.
    await cargar(true)
    setSiguiendoAccion(false)
  }

  const irAPerfil = (u: string | null) => {
    setLista(null)
    setBuscando(false)
    if (!u) return
    if (perfil?.esPropio && u === perfil.usuario.username) return
    router.push(`/perfil?u=${encodeURIComponent(u)}`)
  }

  /**
   * Al tocar una línea se abre el gooal. La lista solo lleva lo justo para
   * pintarse, así que la fila entera del catálogo se pide ahora.
   */
  const abrirLinea = async (linea: LineaPerfil) => {
    if (abriendo) return
    setAbriendo(true)
    setError('')
    try {
      const g = await getGooalDeLista(linea.userGooalId)
      if (g) setFicha({
        gooal: g,
        logro: linea.fotoVisible ? { userGooalId: linea.userGooalId, quienLaVe: linea.quienLaVe } : null,
      })
      else setError('Este gooal ya no está disponible.')
    } catch (e) {
      console.error('[perfil:ficha]', e)
      setError('No hemos podido abrir este gooal. Inténtalo de nuevo.')
    } finally {
      setAbriendo(false)
    }
  }

  const cambiarPestana = (nueva: PestanaPerfil) => {
    setPestana(nueva)
    // El filtro vuelve a "Todos" al cambiar de pestaña: lo que compartís en una
    // no dice nada de la otra, y si en la nueva no hay nada en común la pastilla
    // desaparece y el filtro se quedaría puesto, enseñando una lista vacía.
    setSoloEnComun(false)
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

  const lineas = pestana === 'conseguidos' ? perfil.conseguidos : perfil.pendientes
  const cuantasEnComun = lineas.filter(l => l.enComun).length
  const visibles = soloEnComun ? lineas.filter(l => l.enComun) : lineas
  const nivel = progresoNivel(perfil.puntos).actual

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
            nivel={perfil.esPropio ? null : nivel}
            onSeguir={handleSeguir}
            onAjustes={() => setAjustes(true)}
            onLista={setLista}
          />

          {error && (
            <p role="alert" className="text-sm text-[#FF5252] bg-[rgba(255,82,82,0.14)] px-3 py-2 rounded-lg mt-4">{error}</p>
          )}

          <div style={{ marginTop: 14 }}>
            <TarjetaCifras
              conseguidos={perfil.conseguidos.length}
              pendientes={perfil.pendientes.length}
              puntos={perfil.puntos}
              conProgreso={perfil.esPropio}
            />
          </div>

          {/* Las categorías van entre las cifras y las pestañas, y comparten el
              color con las barritas de la lista: "mucho viajes y poco deporte"
              dice qué clase de persona es alguien mejor que el número total. */}
          <div style={{ marginTop: 14 }}>
            <PastillasCategorias conteos={perfil.porCategoria} />
          </div>

          <div style={{ marginTop: 20 }}>
            <PestanasPerfil activa={pestana} onCambiar={cambiarPestana} />
          </div>

          {/* La misma pantalla en el perfil propio y en el ajeno. La única
              diferencia es esta pastilla, y se quita ella sola cuando no hay nada
              en común, que con pocos usuarios es casi siempre. */}
          <FiltroEnComun
            activo={soloEnComun}
            total={lineas.length}
            enComun={cuantasEnComun}
            onCambiar={setSoloEnComun}
          />

          <div role="tabpanel" style={{ paddingTop: 12 }}>
            {lineas.length === 0 ? (
              pestana === 'conseguidos' ? (
                <EstadoVacio
                  titulo={perfil.esPropio ? 'Aún no has conseguido ningún gooal.' : 'Todavía no ha conseguido ningún gooal.'}
                  texto={perfil.esPropio ? 'Elige uno y ve a por él.' : undefined}
                  accion={perfil.esPropio ? botonExplorar : undefined}
                />
              ) : (
                <EstadoVacio
                  titulo={perfil.esPropio ? 'Tu lista de pendientes está vacía.' : 'No tiene gooals pendientes.'}
                  texto={perfil.esPropio ? 'Añade los que quieras vivir desde Explorar.' : undefined}
                  accion={perfil.esPropio ? botonExplorar : undefined}
                />
              )
            ) : (
              <ListaPerfil lineas={visibles} onAbrir={abrirLinea} />
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

      {buscando && (
        <BuscarUsuariosSheet
          onClose={() => setBuscando(false)}
          onUsuarioClick={irAPerfil}
        />
      )}

      {invitando && <InvitarAmigoSheet onClose={() => setInvitando(false)} />}

      {/* El proveedor envuelve SOLO la ficha, que es lo único de esta pantalla
          que puede enseñar la foto de alguien. La lista son títulos y no firma
          ninguna dirección: ese es medio motivo de que sea una lista. */}
      {ficha && (
        <ProveedorFotosPrivadas>
          <GooalV2DetailModal
            gooal={ficha.gooal}
            estado={misEstados[ficha.gooal.id]}
            logro={ficha.logro}
            onClose={() => setFicha(null)}
            onCambio={() => cargar(true)}
            onCompletado={setCelebracion}
          />
        </ProveedorFotosPrivadas>
      )}

      {celebracion && (
        <CelebracionPuntos resultado={celebracion} onClose={() => setCelebracion(null)} />
      )}
    </>
  )
}
