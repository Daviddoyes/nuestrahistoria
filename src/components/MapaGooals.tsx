'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { LocateFixed } from 'lucide-react'
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

/**
 * Vista por defecto: España entera a nivel de país. Enseña la península, Francia
 * y el norte de Marruecos, donde siempre hay grupos de pines (185 solo en la
 * península). La pantalla principal nunca debe abrirse vacía.
 */
const CENTRO_DEFECTO: [number, number] = [40.3, -3.7]

/**
 * Zoom de entrada, también cuando sí hay ubicación. Amplio a propósito: con zoom
 * de calle, quien no tiene gooals alrededor ve un mapa vacío y cree que la app
 * está rota. Desde aquí se ven los grupos de pines a la primera.
 */
const ZOOM_ENTRADA = 5

/** Zoom de "centrar en mí": para ver qué hay al lado, que es un gesto voluntario. */
const ZOOM_CERCA = 14

/** Última vista del mapa en este navegador. */
const CLAVE_VISTA = 'gooals:mapa:vista'

type Vista = { lat: number; lng: number; zoom: number }

/** La vista guardada, solo si es válida. localStorage lo puede tocar cualquiera. */
function leerVista(): Vista | null {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_VISTA) ?? 'null') as Partial<Vista> | null
    if (
      v && Number.isFinite(v.lat) && Number.isFinite(v.lng) && Number.isFinite(v.zoom) &&
      Math.abs(v.lat as number) <= 90 && Math.abs(v.lng as number) <= 180 &&
      (v.zoom as number) >= 1 && (v.zoom as number) <= 19
    ) {
      return v as Vista
    }
  } catch {
    // Modo privado estricto o un valor corrupto: se sigue sin vista guardada.
  }
  return null
}

function guardarVista(mapa: L.Map) {
  try {
    // wrap(): tras dar vueltas al mundo la longitud puede pasar de 180.
    const c = mapa.getCenter().wrap()
    localStorage.setItem(CLAVE_VISTA, JSON.stringify({
      lat: +c.lat.toFixed(5), lng: +c.lng.toFixed(5), zoom: mapa.getZoom(),
    }))
  } catch {
    // Sin almacenamiento, simplemente no se recuerda la vista.
  }
}

/** Tu posición: un punto con halo, NO un pin. Como pin, la gente cree que ella misma es un gooal. */
const ICONO_POSICION = L.divIcon({
  className: '',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  html: `<div style="
    width:12px;height:12px;border-radius:50%;background:#00D1A7;
    border:2px solid #0B0B0B;
    box-shadow:0 0 0 7px rgba(0,209,167,0.22),0 0 12px 4px rgba(0,209,167,0.35);"></div>`,
})

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

/** Mensajes de "centrar en mí" cuando no sale bien. Siempre hay respuesta al toque. */
function mensajeUbicacion(error: GeolocationPositionError | null): string {
  if (!error) return 'Tu navegador no permite saber tu ubicación.'
  if (error.code === error.PERMISSION_DENIED) {
    return 'No tenemos permiso para ver tu ubicación. Actívalo en los ajustes del móvil para este navegador.'
  }
  return 'No hemos podido encontrar tu ubicación. Inténtalo de nuevo.'
}

export default function MapaGooals({ filtros, estados, onSeleccionar }: Props) {
  const [pines, setPines] = useState<PinMapa[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  // La vista guardada se lee una sola vez, al montar: manda sobre la de entrada.
  const [vistaInicial] = useState(leerVista)
  const [mapa, setMapa] = useState<L.Map | null>(null)
  const [posicion, setPosicion] = useState<{ lat: number; lng: number } | null>(null)
  const [localizando, setLocalizando] = useState(false)
  const [aviso, setAviso] = useState('')

  /**
   * Si la persona ya ha movido el mapa (o venía de una vista guardada), nada
   * automático lo recoloca. Sin esto, una ubicación que llega tarde la sacaría
   * de donde estaba mirando.
   */
  const usuarioMovio = useRef(vistaInicial !== null)
  /** Los movimientos que hace el código no cuentan como "el usuario ha movido el mapa". */
  const moviendoPorCodigo = useRef(false)

  // Una sola petición, al montar. Se repite solo si cambian los filtros, que
  // cambian QUÉ pines hay; mover el mapa no cambia nada y por eso no consulta.
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

  // ── Recordar la última vista ─────────────────────────────
  // Solo se guarda lo que la persona ha elegido. Si se guardara la vista de
  // entrada sin que nadie la tocara, la próxima vez mandaría sobre la ubicación
  // y el mapa ya no se centraría nunca en ella.
  useEffect(() => {
    if (!mapa) return
    const alArrastrar = () => { usuarioMovio.current = true }
    const alEmpezarZoom = () => { if (!moviendoPorCodigo.current) usuarioMovio.current = true }
    const alTerminar = () => {
      moviendoPorCodigo.current = false
      if (usuarioMovio.current) guardarVista(mapa)
    }
    mapa.on('dragstart', alArrastrar)
    mapa.on('zoomstart', alEmpezarZoom)
    mapa.on('moveend', alTerminar)
    // La atribución de OpenStreetMap y CARTO es obligatoria; se pasa a la
    // izquierda para dejar la esquina derecha al botón de centrar.
    mapa.attributionControl.setPosition('bottomleft')
    return () => {
      mapa.off('dragstart', alArrastrar)
      mapa.off('zoomstart', alEmpezarZoom)
      mapa.off('moveend', alTerminar)
      if (usuarioMovio.current) guardarVista(mapa)
    }
  }, [mapa])

  // ── Ubicación al entrar, SOLO si ya había permiso ────────
  // No se pregunta al abrir: la gente dice que no antes de saber qué es esto, y
  // en el móvil ese "no" es casi definitivo. El permiso se pide la primera vez
  // que alguien toca "centrar en mí". Pero si ya lo dio antes, se usa en silencio.
  useEffect(() => {
    if (!mapa || !navigator.geolocation || !navigator.permissions) return
    let vivo = true
    navigator.permissions
      .query({ name: 'geolocation' })
      .then(estado => {
        if (!vivo || estado.state !== 'granted') return
        navigator.geolocation.getCurrentPosition(
          pos => {
            if (!vivo) return
            const punto = { lat: pos.coords.latitude, lng: pos.coords.longitude }
            setPosicion(punto)
            if (!usuarioMovio.current) {
              moviendoPorCodigo.current = true
              mapa.setView([punto.lat, punto.lng], ZOOM_ENTRADA)
            }
          },
          // Sin ubicación se queda la vista por defecto, que ya tiene pines.
          err => console.warn('[mapa] ubicación de entrada:', err.message),
          { timeout: 5000, maximumAge: 5 * 60 * 1000 },
        )
      })
      .catch(() => { /* Navegador sin Permissions API: se queda la vista por defecto. */ })
    return () => { vivo = false }
  }, [mapa])

  // ── Punto de tu posición ─────────────────────────────────
  useEffect(() => {
    if (!mapa || !posicion) return
    const punto = L.marker([posicion.lat, posicion.lng], {
      icon: ICONO_POSICION,
      interactive: false,
      keyboard: false,
      zIndexOffset: 1000,
    }).addTo(mapa)
    return () => { punto.remove() }
  }, [mapa, posicion])

  // Los avisos se van solos: no deben tapar el mapa para siempre.
  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(''), 6000)
    return () => clearTimeout(t)
  }, [aviso])

  const centrarEnMi = () => {
    if (!mapa || localizando) return
    setAviso('')
    if (!navigator.geolocation) {
      setAviso(mensajeUbicacion(null))
      return
    }
    // Es un gesto voluntario: lo que quede a la vista después es su elección.
    usuarioMovio.current = true
    setLocalizando(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const punto = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setPosicion(punto)
        setLocalizando(false)
        mapa.flyTo([punto.lat, punto.lng], ZOOM_CERCA, { duration: 0.8 })
      },
      err => {
        setLocalizando(false)
        setAviso(mensajeUbicacion(err))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60 * 1000 },
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer
        ref={setMapa}
        center={vistaInicial ? [vistaInicial.lat, vistaInicial.lng] : CENTRO_DEFECTO}
        zoom={vistaInicial ? vistaInicial.zoom : ZOOM_ENTRADA}
        scrollWheelZoom
        style={{ width: '100%', height: '100%', background: '#1E2120' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={19}
        />
        <CapaPines pines={pines} estados={estados} onSeleccionar={onSeleccionar} />
      </MapContainer>

      {aviso ? (
        <div role="alert" style={{ ...avisoEstilo, whiteSpace: 'normal', width: 'calc(100% - 24px)', maxWidth: 420, textAlign: 'center', color: '#FFFFFF' }}>
          {aviso}
        </div>
      ) : cargando ? (
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
      ) : error ? (
        <div style={avisoEstilo}>No se pudieron cargar los gooals</div>
      ) : pines.length === 0 ? (
        <div style={avisoEstilo}>Ningún gooal con mapa coincide con el filtro</div>
      ) : null}

      {mapa && (
        <button
          onClick={centrarEnMi}
          aria-label="Centrar en mi ubicación"
          aria-busy={localizando}
          className="active:bg-[#1E2120] transition-colors"
          style={{
            position: 'absolute', right: 14, bottom: 14, zIndex: 1000,
            width: 48, height: 48, borderRadius: '50%',
            background: '#161817', border: '1px solid #2A2E2C',
            color: posicion ? '#00D1A7' : '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.45)',
          }}
        >
          {localizando
            ? <span className="w-5 h-5 border-2 border-[#00D1A7] border-t-transparent rounded-full animate-spin" />
            : <LocateFixed className="w-5 h-5" />}
        </button>
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
