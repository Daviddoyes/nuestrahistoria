'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import {
  getPerfil, seguirUsuario, dejarDeSeguir, getGooalDeLista, getMisEstadosGooals,
} from '@/lib/actions'
import { progresoNivel } from '@/lib/niveles'
import AppShell, { PantallaCargando, EstadoVacio } from '@/components/AppShell'
import ListaUsuariosModal from '@/components/ListaUsuariosModal'
import GooalV2DetailModal from '@/components/GooalV2DetailModal'
import CelebracionPuntos from '@/components/CelebracionPuntos'
import type { ResultadoCompletado } from '@/components/AnadirFotoModal'
import CabeceraPerfil from '@/components/perfil/CabeceraPerfil'
import PestanasPerfil, { type PestanaPerfil } from '@/components/perfil/PestanasPerfil'
import Universo from '@/components/perfil/Universo'
import EnComun, { CabeceraRelacion, cruzar, type RelacionEnComun } from '@/components/perfil/EnComun'
import ListaPerfil from '@/components/perfil/ListaPerfil'
import { ProveedorFotosPrivadas } from '@/components/FotosPrivadas'
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

  // ?u=<username> abre el perfil de otra persona; sin parámetro, el propio.
  const username = searchParams.get('u')

  const [perfil, setPerfil] = useState<PerfilCompleto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [siguiendoAccion, setSiguiendoAccion] = useState(false)
  const [pestana, setPestana] = useState<PestanaPerfil>('conseguidos')
  /**
   * Qué relación de "en común" se está mirando. null = las tres filas.
   *
   * Es un estado y no una ruta porque se entra y se sale dentro de la misma
   * pantalla; al cambiar de pestaña o de perfil vuelve a null solo.
   */
  const [relacion, setRelacion] = useState<RelacionEnComun | null>(null)

  const [lista, setLista] = useState<'seguidores' | 'siguiendo' | null>(null)
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
      setRelacion(null)
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
    // Salir de "en común" cierra la relación que estuviera abierta: volver a esa
    // pestaña y aparecer dentro de una sublista es de las cosas que hacen que
    // alguien no sepa dónde está.
    setRelacion(null)
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

  const lineas = pestana === 'pendientes' ? perfil.pendientes : perfil.conseguidos
  const progreso = progresoNivel(perfil.puntos)
  const nivel = progreso.actual
  // Los gooals de la relación abierta. Se cruza aquí y no en el servidor porque
  // las dos piezas ya están en la pantalla: sus listas y mis estados.
  const deLaRelacion = relacion
    ? cruzar(perfil.conseguidos, perfil.pendientes, misEstados)[relacion]
    : []

  return (
    <>
      <AppShell tab="perfil" fotoPerfil={perfil.esPropio ? perfil.usuario.foto_perfil_url : null}>
        <div style={{ padding: '0 20px 32px' }}>

          {/* ── Barra superior ─────────────────────────────── */}
          {/* Las dos flechas vuelven atrás, a sitios distintos: desde el perfil
              de otra persona, al tuyo; desde el tuyo, a Tú, que es de donde se
              llega (desde "Ver los N pendientes"). */}
          <div style={{ display: 'flex', alignItems: 'center', minHeight: 44 }}>
            <button
              onClick={() => router.push(perfil.esPropio ? '/inicio' : '/perfil')}
              aria-label={perfil.esPropio ? 'Volver' : 'Volver a mi perfil'}
              className="text-[#7A8A85] active:text-[#00D1A7] transition-colors w-11 h-11 -ml-3 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          {/* TU pantalla es la entrada (/inicio): allí está tu universo, tu nivel
              y tus cifras. Aquí queda lo que no cabía allí, que son tus dos
              listas enteras. El perfil de OTRA persona sí se pinta entero aquí,
              porque de ella no hay ninguna otra pantalla. */}
          {perfil.esPropio ? (
            <h1
              className="fuente-titular"
              style={{ fontSize: 20, fontWeight: 650, letterSpacing: '.1em', textIndent: '.1em', textTransform: 'uppercase', paddingTop: 4 }}
            >
              Tus gooals
            </h1>
          ) : (
            <>
              <CabeceraPerfil
                usuario={perfil.usuario}
                siguiendolo={perfil.siguiendolo}
                seguidores={perfil.seguidores}
                siguiendo={perfil.siguiendo}
                siguiendoAccion={siguiendoAccion}
                onSeguir={handleSeguir}
                onLista={setLista}
              />

              <div style={{ textAlign: 'center', marginTop: 18 }}>
                <p
                  className="fuente-titular"
                  style={{ fontSize: 20, fontWeight: 650, lineHeight: 1, letterSpacing: '.1em', textIndent: '.1em', textTransform: 'uppercase' }}
                >
                  {nivel.nombre}
                </p>
                <p style={{ marginTop: 6, fontSize: 12, color: '#7A8A85', fontWeight: 500, lineHeight: 1 }}>
                  {perfil.puntos} puntos
                </p>
              </div>

              {/* Su universo, con las seis categorías en LAS MISMAS posiciones que
                  el tuyo: es lo que permite compararos de un vistazo sin leer ni
                  un número.

                  Sus intereses van en null a propósito, así que sus categorías
                  vacías salen en gris y nunca en verde: lo que marcó en el alta
                  no es algo que publicara.

                  16 y no 8: la etiqueta de la categoría de arriba (VIDA) se le
                  montaba casi encima a la línea de los puntos. */}
              <div style={{ marginTop: 16 }}>
                <Universo
                  conteos={perfil.porCategoria}
                  intereses={null}
                  foto={perfil.usuario.foto_perfil_url}
                  nombre={perfil.usuario.nombre}
                  porcentajeNivel={progreso.porcentaje}
                  resumen={`Gooals conseguidos por ${perfil.usuario.nombre}: ${perfil.conseguidos.length} en total.`}
                />
              </div>
            </>
          )}

          {error && (
            <p role="alert" className="text-sm text-[#FF5252] bg-[rgba(255,82,82,0.14)] px-3 py-2 rounded-lg mt-4">{error}</p>
          )}

          <div style={{ marginTop: perfil.esPropio ? 20 : 8 }}>
            <PestanasPerfil activa={pestana} conComun={!perfil.esPropio} onCambiar={cambiarPestana} />
          </div>

          <div role="tabpanel" style={{ paddingTop: 12 }}>
            {pestana === 'comun' ? (
              relacion === null ? (
                <EnComun
                  conseguidos={perfil.conseguidos}
                  pendientes={perfil.pendientes}
                  misEstados={misEstados}
                  nombre={perfil.usuario.nombre}
                  onAbrirRelacion={setRelacion}
                />
              ) : (
                <>
                  <CabeceraRelacion
                    relacion={relacion}
                    nombre={perfil.usuario.nombre}
                    cuantos={deLaRelacion.length}
                    onVolver={() => setRelacion(null)}
                  />
                  <div style={{ paddingTop: 10 }}>
                    <ListaPerfil lineas={deLaRelacion} onAbrir={abrirLinea} />
                  </div>
                </>
              )
            ) : lineas.length === 0 ? (
              pestana === 'conseguidos' ? (
                <EstadoVacio
                  titulo={perfil.esPropio ? 'Aún no has conseguido ningún gooal.' : 'Todavía no ha conseguido ningún gooal.'}
                  texto={perfil.esPropio ? 'Elige uno y ve a por él.' : undefined}
                  /* Sin botón en TU perfil: en Tú, a una pantalla, ya hay uno que
                     lleva al mismo sitio. Dos botones distintos a la misma
                     pantalla no son dos opciones, son una duda. */
                  accion={undefined}
                />
              ) : (
                <EstadoVacio
                  titulo={perfil.esPropio ? 'Tu lista de pendientes está vacía.' : 'No tiene gooals pendientes.'}
                  texto={perfil.esPropio ? 'Añade los que quieras vivir desde Explorar.' : undefined}
                  accion={perfil.esPropio ? botonExplorar : undefined}
                />
              )
            ) : (
              <ListaPerfil lineas={lineas} onAbrir={abrirLinea} />
            )}
          </div>

        </div>
      </AppShell>

      {/* ── Modales ──────────────────────────────────────── */}
      {lista && (
        <ListaUsuariosModal
          userId={perfil.usuario.id}
          tipo={lista}
          cuantos={{ seguidores: perfil.seguidores, siguiendo: perfil.siguiendo }}
          onClose={() => setLista(null)}
          onUsuarioClick={irAPerfil}
        />
      )}

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
