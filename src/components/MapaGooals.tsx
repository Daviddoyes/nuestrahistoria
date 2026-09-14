'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
// El CSS de Leaflet no viaja con el JS: sin estas tres hojas el mapa sale como
// un mosaico de imágenes sueltas y los clusters sin su círculo.
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

import { getPinesMapa, getGooalV2 } from '@/lib/actions'
import { CATEGORIA_COLOR } from '@/lib/gooals'
import type { CategoriaGooal, DificultadGooal } from '@/lib/gooals'
import type { GooalV2, PinMapa, EstadoUserGooal } from '@/types/gooals'

/** Europa entera, cuando no hay ubicación del usuario. */
export const CENTRO_EUROPA: [number, number] = [48.5, 10]
export const ZOOM_EUROPA = 4
/** Zoom de ciudad, cuando sí la hay. */
export const ZOOM_CIUDAD = 13

/**
 * Colores de estado. Son los mismos que los overlays de las cards de la lista,
 * para que las dos vistas se lean igual: si en la lista lo conseguido es verde,
 * en el mapa también.
 */
const VERDE_COMPLETADO = '#00D1A7'
const TURQUESA_PENDIENTE = '#00D1A7'
/** Borde de un pin sin estado: el fondo de la app, que lo recorta del mapa. */
const BORDE_NEUTRO = '#0B0B0B'

type Filtros = {
  categoria: CategoriaGooal | 'todos'
  dificultad: DificultadGooal | null
  busqueda: string
}

type Props = {
  filtros: Filtros
  /** Qué tiene el usuario en su lista. El mismo objeto que pinta los overlays de las cards. */
  estados: Record<string, EstadoUserGooal>
  /** Ubicación del usuario; si llega después de montar, el mapa vuela hasta ella. */
  posicion: { lat: number; lng: number } | null
  /** La llama el botón "Ver gooal" del popup, no el clic en el pin. */
  onSeleccionar: (gooalId: string) => void
}

/**
 * Pin circular del color de su categoría, con el estado del usuario encima.
 *
 * Ya no lleva el emoji de la dificultad: el pin solo trae cuatro campos y la
 * dificultad no es uno de ellos. El hueco lo ocupa ahora el ✓ de lo conseguido,
 * que en un mapa dice bastante más.
 */
function iconoDe(pin: PinMapa, estado: EstadoUserGooal | undefined): L.DivIcon {
  const color = CATEGORIA_COLOR[pin.categoria] ?? '#7A8A85'
  const borde = estado === 'completado' ? VERDE_COMPLETADO
    : estado === 'pendiente' ? TURQUESA_PENDIENTE
      : BORDE_NEUTRO
  const glifo = estado === 'completado' ? '✓' : ''
  return L.divIcon({
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    html: `<div style="
      width:26px;height:26px;border-radius:50%;
      background:${color};border:2px solid ${borde};
      box-shadow:0 1px 4px rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;
      color:#FFFFFF;font-size:14px;font-weight:700;line-height:1;">${glifo}</div>`,
  })
}

/**
 * Contenido del popup: el vistazo rápido más el botón que abre la ficha.
 *
 * Son dos pasos a propósito. El mapa se usa para curiosear, y si cada pin
 * abriera la ficha, mirar diez sitios serían diez modales que cerrar. El popup
 * es el vistazo; la ficha, la decisión.
 *
 * El nodo se devuelve al momento, con un "Cargando...", y se rellena cuando
 * llega el gooal: el pin no trae ni título ni ciudad, así que hay que pedirlos.
 * Se pide uno, el que se ha pulsado, no los 3.232.
 *
 * Se construye como nodo del DOM y no como cadena de HTML porque el botón
 * necesita un listener de verdad, y porque con textContent el título no hay
 * que escaparlo a mano.
 */
function contenidoPopup(
  id: string,
  onVer: (id: string) => void,
  pedirGooal: (id: string) => Promise<GooalV2 | null>,
): HTMLElement {
  const caja = L.DomUtil.create('div')
  caja.style.minWidth = '170px'

  const titulo = L.DomUtil.create('p', '', caja)
  titulo.textContent = 'Cargando...'
  Object.assign(titulo.style, {
    fontSize: '13px', fontWeight: '600', color: '#0B0B0B',
    margin: '0 0 4px', lineHeight: '1.3',
  })

  const lugar = L.DomUtil.create('p', '', caja)
  Object.assign(lugar.style, { fontSize: '11px', color: '#7A8A85', margin: '0' })

  const puntos = L.DomUtil.create('p', '', caja)
  Object.assign(puntos.style, {
    fontSize: '11px', color: '#00B893', fontWeight: '700', margin: '4px 0 0',
  })

  const boton = L.DomUtil.create('button', '', caja)
  boton.type = 'button'
  boton.textContent = 'Ver gooal'
  // Deshabilitado hasta que llegue la ficha: pulsarlo antes abriría un modal
  // vacío mientras todavía se está pidiendo lo que va dentro.
  boton.disabled = true
  Object.assign(boton.style, {
    width: '100%', marginTop: '8px', padding: '6px 10px',
    fontSize: '12px', fontWeight: '600', color: '#0B0B0B',
    background: '#00D1A7', border: 'none', borderRadius: '8px',
    cursor: 'pointer', opacity: '0.5',
  })
  // Sin esto el clic atraviesa el popup y lo recoge el mapa, que lo interpreta
  // como un clic en el fondo y cierra el popup antes de abrir la ficha.
  L.DomEvent.disableClickPropagation(boton)
  L.DomEvent.on(boton, 'click', () => onVer(id))

  pedirGooal(id)
    .then(g => {
      if (!g) {
        titulo.textContent = 'No se pudo cargar este gooal'
        return
      }
      titulo.textContent = g.titulo
      lugar.textContent = [g.ciudad, g.pais].filter(Boolean).join(', ')
      puntos.textContent = `+${g.puntos} pts`
      boton.disabled = false
      boton.style.opacity = '1'
    })
    .catch(() => { titulo.textContent = 'No se pudo cargar este gooal' })

  return caja
}

/**
 * Capa de pines. Pinta lo que ya está en memoria y no consulta nada: mover o
 * hacer zoom no dispara ninguna petición, porque el catálogo entero ya está
 * descargado. Vive dentro de MapContainer porque useMap() necesita el contexto
 * de react-leaflet.
 */
function CapaPines({
  pines, estados, onSeleccionar,
}: {
  pines: PinMapa[]
  estados: Record<string, EstadoUserGooal>
  onSeleccionar: (id: string) => void
}) {
  const map = useMap()
  const grupo = useRef<L.MarkerClusterGroup | null>(null)
  // Lo que ya se ha pedido para un popup: reabrir el mismo pin no vuelve a
  // consultar. El catálogo no cambia mientras el mapa está abierto.
  const fichas = useRef(new Map<string, GooalV2 | null>())

  // El grupo de clusters se crea una vez y se reutiliza: recrearlo en cada
  // repintado haría parpadear el mapa entero.
  useEffect(() => {
    const capa = L.markerClusterGroup({
      maxClusterRadius: 50,
      showCoverageOnHover: false,
    })
    grupo.current = capa
    map.addLayer(capa)
    return () => {
      map.removeLayer(capa)
      grupo.current = null
    }
  }, [map])

  const pedirGooal = useCallback(async (id: string) => {
    const guardado = fichas.current.get(id)
    if (guardado !== undefined) return guardado
    const g = await getGooalV2(id)
    fichas.current.set(id, g)
    return g
  }, [])

  useEffect(() => {
    const capa = grupo.current
    if (!capa) return
    capa.clearLayers()
    capa.addLayers(
      pines.map(p =>
        L.marker([p.lat, p.lng], { icon: iconoDe(p, estados[p.id]) })
          // bindPopup con una función lo construye al abrirlo: de los miles de
          // pines cargados solo se crea el nodo del que se pulsa.
          .bindPopup(() => contenidoPopup(p.id, onSeleccionar, pedirGooal)),
      ),
    )
  }, [pines, estados, onSeleccionar, pedirGooal])

  return null
}

/** Vuela a la ubicación del usuario cuando el navegador la resuelve. */
function Centrar({ posicion }: { posicion: { lat: number; lng: number } | null }) {
  const map = useMap()
  const yaCentrado = useRef(false)

  useEffect(() => {
    // Solo la primera vez: si no, cada rerender devolvería al usuario a su
    // ciudad después de haber arrastrado el mapa a otro sitio.
    if (!posicion || yaCentrado.current) return
    yaCentrado.current = true
    map.setView([posicion.lat, posicion.lng], ZOOM_CIUDAD)
  }, [posicion, map])

  return null
}

export default function MapaGooals({ filtros, estados, posicion, onSeleccionar }: Props) {
  const [pines, setPines] = useState<PinMapa[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  // Una sola petición, al montar. Se repite solo si cambian los filtros, que
  // cambian QUÉ pines hay; mover el mapa no cambia nada y por eso no consulta.
  // La búsqueda ya llega con su propio debounce desde Explorar.
  useEffect(() => {
    let vivo = true
    setCargando(true)
    setError(false)
    getPinesMapa(filtros)
      .then(datos => { if (vivo) setPines(datos) })
      .catch(e => {
        console.error('[mapa]', e)
        if (vivo) setError(true)
      })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [filtros])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer
        center={CENTRO_EUROPA}
        zoom={ZOOM_EUROPA}
        scrollWheelZoom
        style={{ width: '100%', height: '100%', background: '#1E2120' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={19}
        />
        <CapaPines pines={pines} estados={estados} onSeleccionar={onSeleccionar} />
        <Centrar posicion={posicion} />
      </MapContainer>

      {cargando && (
        <div style={avisoEstilo}>
          <span
            style={{
              width: 12, height: 12, border: '2px solid #00D1A7',
              borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block',
            }}
            className="animate-spin"
          />
          Cargando gooals...
        </div>
      )}

      {!cargando && error && (
        <div style={avisoEstilo}>No se pudieron cargar los gooals</div>
      )}

      {!cargando && !error && pines.length === 0 && (
        <div style={avisoEstilo}>Ningún gooal con mapa coincide con el filtro</div>
      )}
    </div>
  )
}

/** Aviso flotante sobre el mapa. z-index alto: Leaflet usa hasta el 800. */
const avisoEstilo: React.CSSProperties = {
  position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
  zIndex: 1000, display: 'flex', alignItems: 'center', gap: 7,
  background: 'rgba(11,11,11,0.88)', color: '#A3B1AC',
  fontSize: 12, padding: '7px 13px', borderRadius: 999,
  border: '1px solid #2A2E2C', whiteSpace: 'nowrap', pointerEvents: 'none',
}
