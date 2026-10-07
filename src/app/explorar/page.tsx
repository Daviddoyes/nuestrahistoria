'use client'

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  getMyProfile, getMisEstadosGooals, getGooalV2, getCuantosEnMapa,
} from '@/lib/actions'
import AppShell, { PantallaCargando } from '@/components/AppShell'
import ExplorarFeed from '@/components/ExplorarFeed'
import FiltrosCatalogo, { SIN_FILTROS, type Filtros } from '@/components/explorar/FiltrosCatalogo'
import Descubrir from '@/components/explorar/Descubrir'
import GooalV2DetailModal from '@/components/GooalV2DetailModal'
import SugerirGooalSheet from '@/components/SugerirGooalSheet'
import CelebracionPuntos from '@/components/CelebracionPuntos'
import type { ResultadoCompletado } from '@/components/AnadirFotoModal'
import type { Profile, GooalV2, EstadoUserGooal } from '@/types/gooals'

/**
 * Leaflet toca `window` nada más cargarse, así que no puede renderizarse en el
 * servidor: con SSR el build revienta. Se carga solo en el navegador.
 */
const MapaGooals = dynamic(() => import('@/components/MapaGooals'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="w-5 h-5 border-2 border-[#2A2E2C] border-t-[#00D1A7] rounded-full animate-spin" />
    </div>
  ),
})

type Pestana = 'lista' | 'mapa' | 'descubrir'

/** Espera antes de mandar la búsqueda al servidor, para no lanzar una consulta por tecla. */
const ESPERA_BUSQUEDA = 300

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
  const [misEstados, setMisEstados] = useState<Record<string, EstadoUserGooal>>({})
  const [cuantos, setCuantos] = useState<{ conSitio: number; total: number } | null>(null)

  // ?q= llega del buscador de Inicio; ?tab= de /mapa y de los enlaces guardados.
  const tabPedida = searchParams.get('tab')
  const [pestana, setPestana] = useState<Pestana>(
    tabPedida === 'mapa' ? 'mapa' : tabPedida === 'descubrir' ? 'descubrir' : 'lista',
  )
  const [filtros, setFiltros] = useState<Filtros>({ ...SIN_FILTROS, busqueda: searchParams.get('q') ?? '' })
  // Lo escrito y lo aplicado van por separado: la consulta espera a que dejes de
  // teclear, pero el campo tiene que responder a cada tecla.
  const [aplicada, setAplicada] = useState(searchParams.get('q') ?? '')

  const [seleccionado, setSeleccionado] = useState<GooalV2 | null>(null)
  const [sugiriendo, setSugiriendo] = useState(false)
  const [celebracion, setCelebracion] = useState<ResultadoCompletado | null>(null)
  const [aviso, setAviso] = useState('')

  /**
   * El mapa se queda montado una vez visitado, escondido con display:none.
   * Desmontarlo al cambiar de pestaña perdería el zoom y la posición, y volver
   * al mapa te devolvería a la vista del mundo entero cada vez.
   */
  const [mapaVisitado, setMapaVisitado] = useState(pestana === 'mapa')

  useEffect(() => {
    const t = setTimeout(() => setAplicada(filtros.busqueda.trim()), ESPERA_BUSQUEDA)
    return () => clearTimeout(t)
  }, [filtros.busqueda])

  const cargarEstados = useCallback(async () => {
    try {
      setMisEstados(await getMisEstadosGooals())
    } catch (e) {
      console.error('[explorar:estados]', e)
    }
  }, [])

  useEffect(() => {
    Promise.all([getMyProfile(), getMisEstadosGooals(), getCuantosEnMapa()])
      .then(([prof, estados, cuenta]) => {
        if (!prof) { router.push('/'); return }
        setProfile(prof)
        setMisEstados(estados)
        setCuantos(cuenta)
      })
      .catch(e => console.error('[explorar]', e))
      .finally(() => setLoading(false))
  }, [router])

  const cambiarPestana = (nueva: Pestana) => {
    setPestana(nueva)
    if (nueva === 'mapa') setMapaVisitado(true)
    // La pestaña va en la dirección para que se pueda compartir y para que
    // /mapa pueda redirigir aquí. replace y no push: moverse entre pestañas no
    // debería llenar el botón de atrás.
    const url = new URL(window.location.href)
    if (nueva === 'lista') url.searchParams.delete('tab')
    else url.searchParams.set('tab', nueva)
    router.replace(url.pathname + url.search, { scroll: false })
  }

  // El pin solo trae unas pocas columnas; la ficha necesita la fila entera.
  const abrirPorId = useCallback(async (id: string) => {
    setAviso('')
    try {
      const g = await getGooalV2(id)
      if (g) setSeleccionado(g)
      else setAviso('Este gooal ya no está disponible.')
    } catch (e) {
      console.error('[explorar:ficha]', e)
      setAviso('No hemos podido abrir este gooal. Inténtalo de nuevo.')
    }
  }, [])

  const filtrosMapa = useMemo(
    () => ({ categoria: filtros.categoria, busqueda: aplicada }),
    [filtros.categoria, aplicada],
  )

  if (loading) return <PantallaCargando />
  if (!profile) return null

  const cabecera = (
    <>
      <div role="tablist" style={{ display: 'flex', gap: 6, padding: '2px 12px 0' }}>
        {([['lista', 'Lista'], ['mapa', 'Mapa'], ['descubrir', 'Descubrir']] as const).map(([id, texto]) => {
          const activa = pestana === id
          return (
            <button
              key={id}
              role="tab"
              aria-selected={activa}
              onClick={() => cambiarPestana(id)}
              className="transition-colors"
              style={{
                flex: 1, minHeight: 38, borderRadius: 10, fontSize: 13,
                fontWeight: activa ? 650 : 500,
                background: activa ? '#00D1A7' : '#1E2120',
                border: `1px solid ${activa ? '#00D1A7' : '#2A2E2C'}`,
                color: activa ? '#042019' : '#73817D',
              }}
            >
              {texto}
            </button>
          )
        })}
      </div>

      {/* Los filtros son de la lista y del mapa. En Descubrir no pintan nada:
          ahí no se busca, se decide una carta cada vez, y una barra de filtros
          encima robaría el sitio que necesita la foto. */}
      {pestana !== 'descubrir' && <FiltrosCatalogo filtros={filtros} onCambiar={setFiltros} />}

      {pestana === 'mapa' && cuantos && (
        <p style={{ fontSize: 11, color: '#55605C', padding: '0 14px 8px', lineHeight: 1.45, marginTop: -4 }}>
          {cuantos.conSitio} de los {cuantos.total} gooals se pueden poner en el mapa.
          El resto no son de un sitio concreto.
        </p>
      )}
    </>
  )

  return (
    <>
      <AppShell tab="explorar" fotoPerfil={profile.foto_perfil_url} header={cabecera}>
        {/* Las dos vistas conviven: la escondida no se desmonta, para no perder
            el zoom del mapa ni el scroll de la lista al cambiar de pestaña. */}
        <div style={{ display: pestana === 'lista' ? 'block' : 'none' }}>
          <ExplorarFeed
            filtros={{ ...filtros, busqueda: aplicada }}
            estados={misEstados}
            onAbrir={setSeleccionado}
            onSugerir={() => setSugiriendo(true)}
            onLimpiar={() => { setFiltros(SIN_FILTROS); setAplicada('') }}
          />
        </div>

        {/* height 100%, como el mapa: el área de AppShell tiene altura fija y
            las cartas tienen que ocuparla entera, no la de su contenido. */}
        {pestana === 'descubrir' && (
          <div style={{ height: '100%' }}>
            <Descubrir onCompletado={setCelebracion} onCambio={cargarEstados} />
          </div>
        )}

        {mapaVisitado && (
          <div
            style={{
              display: pestana === 'mapa' ? 'block' : 'none',
              // height 100%: el área de contenido de AppShell tiene altura fija, y
              // Leaflet necesita una altura concreta o se queda a cero píxeles.
              // isolation: Leaflet pone sus capas y botones con z-index de hasta
              // 1.000; sin aislarlo, el zoom y los globos se pintarían encima del
              // detalle del gooal.
              position: 'relative', height: '100%', isolation: 'isolate',
            }}
          >
            <MapaGooals filtros={filtrosMapa} estados={misEstados} onSeleccionar={abrirPorId} />

            {aviso && (
              <p
                role="alert"
                className="text-sm text-[#FF5252] bg-[#161817] border border-[rgba(255,82,82,0.35)] px-3 py-2 rounded-lg"
                style={{ position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 1000 }}
              >
                {aviso}
              </p>
            )}
          </div>
        )}
      </AppShell>

      {seleccionado && (
        <GooalV2DetailModal
          gooal={seleccionado}
          estado={misEstados[seleccionado.id]}
          onClose={() => setSeleccionado(null)}
          onCambio={cargarEstados}
          onCompletado={setCelebracion}
        />
      )}

      {sugiriendo && (
        <SugerirGooalSheet
          tituloInicial={filtros.busqueda.trim()}
          categoriaInicial={filtros.categoria === 'todos' ? null : filtros.categoria}
          onClose={() => setSugiriendo(false)}
        />
      )}

      {celebracion && (
        <CelebracionPuntos resultado={celebracion} onClose={() => setCelebracion(null)} />
      )}
    </>
  )
}
