'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Heart, Check, RotateCcw } from 'lucide-react'
import {
  getParaDescubrir, pasarGooal, olvidarPasados, anadirGooal, conseguirSinFoto,
} from '@/lib/actions'
import { CATEGORIA_LABEL } from '@/lib/gooals'
import CreditoFoto from '@/components/CreditoFoto'
import type { ResultadoCompletado } from '@/components/AnadirFotoModal'
import type { CartaDescubrir } from '@/types/gooals'

type Props = {
  onCompletado: (resultado: ResultadoCompletado) => void
  /** Tras añadir o conseguir: la lista y el mapa tienen que enterarse. */
  onCambio: () => void
}

type Salida = 'paso' | 'lista' | 'hecho'

/** Cuánto hay que arrastrar para que cuente como deslizar, en píxeles. */
const UMBRAL = 90

/**
 * Descubrir: los gooals de uno en uno, para decidir rápido.
 *
 * ── TRES SALIDAS, NO DOS ──────────────────────────────────
 *
 * Además de "paso" y "a mi lista" está "ya lo hice", y es la importante: es lo
 * que llena un perfil vacío en cinco minutos sin pedirle a nadie que rellene
 * nada, y es el otro uso de esta app —mirar si existe el gooal de algo que ya
 * hiciste—.
 *
 * ── LO QUE SE DESLIZA Y LO QUE NO ─────────────────────────
 *
 * Se arrastra a la izquierda para pasar y a la derecha para añadir. "Ya lo
 * hice" es SOLO un botón, a propósito: da puntos y es lo único de los tres que
 * cuesta deshacer, y un gesto se hace sin querer con el pulgar.
 */
export default function Descubrir({ onCompletado, onCambio }: Props) {
  const [cartas, setCartas] = useState<CartaDescubrir[]>([])
  const [quedan, setQuedan] = useState(0)
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  // Lo que dura la animación de salida antes de quitar la carta de la lista.
  const [saliendo, setSaliendo] = useState<Salida | null>(null)
  const [arrastre, setArrastre] = useState(0)
  const arrastrando = useRef<number | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await getParaDescubrir()
      setCartas(res.cartas)
      setQuedan(res.quedan)
      setTotal(res.total)
      setError('')
    } catch (e) {
      console.error('[descubrir]', e)
      setError('No hemos podido traer gooals. Inténtalo de nuevo.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const carta = cartas[0]

  const resolver = async (salida: Salida) => {
    if (!carta || ocupado) return
    setOcupado(true)
    setSaliendo(salida)
    setError('')

    try {
      if (salida === 'paso') {
        await pasarGooal(carta.gooal.id)
      } else if (salida === 'lista') {
        const res = await anadirGooal(carta.gooal.id)
        if (!res.success) throw new Error(res.error ?? 'No se pudo añadir.')
        onCambio()
      } else {
        const res = await conseguirSinFoto(carta.gooal.id)
        if (!res.success) throw new Error(res.error ?? 'No se pudo guardar.')
        onCambio()
        onCompletado({
          puntosGanados: res.puntosGanados ?? carta.gooal.puntos,
          puntosTotales: res.puntosTotales ?? 0,
          nivel: res.nivel ?? 'Principiante',
          subioDeNivel: Boolean(res.subioDeNivel),
        })
      }
    } catch (e) {
      console.error('[descubrir:' + salida + ']', e)
      setError(e instanceof Error ? e.message : 'No se pudo guardar. Inténtalo de nuevo.')
      // La carta NO se va si no se pudo guardar: irse igual sería hacerle creer
      // que quedó hecho.
      setSaliendo(null)
      setArrastre(0)
      setOcupado(false)
      return
    }

    // Pequeña espera para que se vea salir, y fuera.
    setTimeout(() => {
      setCartas(prev => prev.slice(1))
      setQuedan(q => Math.max(0, q - 1))
      setSaliendo(null)
      setArrastre(0)
      setOcupado(false)
    }, 180)
  }

  // ── Arrastrar ─────────────────────────────────────────────
  const alEmpezar = (e: React.PointerEvent) => {
    if (ocupado || !carta) return
    arrastrando.current = e.clientX
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const alMover = (e: React.PointerEvent) => {
    if (arrastrando.current === null) return
    setArrastre(e.clientX - arrastrando.current)
  }
  const alSoltar = () => {
    if (arrastrando.current === null) return
    const x = arrastre
    arrastrando.current = null
    if (x <= -UMBRAL) resolver('paso')
    else if (x >= UMBRAL) resolver('lista')
    else setArrastre(0)
  }

  const volverAEmpezar = async () => {
    setOcupado(true)
    try {
      await olvidarPasados()
      await cargar()
    } finally {
      setOcupado(false)
    }
  }

  if (cargando) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-5 h-5 border-2 border-[#2A2E2C] border-t-[#00D1A7] rounded-full animate-spin" />
      </div>
    )
  }

  // ── Se acabaron ──────────────────────────────────────────
  if (!carta) {
    const vistosTodos = quedan === 0
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '0 32px', textAlign: 'center' }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF' }}>
          {vistosTodos ? 'Los has visto todos' : 'No queda ninguno por ahora'}
        </p>
        <p style={{ fontSize: 13, color: '#7A8A85', lineHeight: 1.5 }}>
          {vistosTodos
            ? `Has pasado por los ${total} gooals que tienen foto. Puedes volver a empezar: solo se olvida lo que pasaste, no lo que añadiste ni lo que conseguiste.`
            : 'Vuelve a probar en un rato.'}
        </p>
        {vistosTodos && (
          <button
            onClick={volverAEmpezar}
            disabled={ocupado}
            className="active:bg-[#00B893] transition-colors disabled:opacity-60"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 48, marginTop: 10,
              padding: '0 20px', borderRadius: 12, background: '#00D1A7',
              color: '#0B0B0B', fontSize: 14, fontWeight: 600,
            }}
          >
            <RotateCcw aria-hidden style={{ width: 16, height: 16 }} /> Volver a empezar
          </button>
        )}
        {error && <p role="alert" style={{ fontSize: 13, color: '#FF5252', marginTop: 8 }}>{error}</p>}
      </div>
    )
  }

  const { gooal, pendientes, conseguidos } = carta
  const lugar = [gooal.ciudad, gooal.pais].filter(Boolean).join(', ')
  const inclinacion = Math.max(-12, Math.min(12, arrastre / 14))
  const fueraX = saliendo === 'paso' ? -500 : saliendo === 'lista' ? 500 : 0

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '0 14px 10px' }}>
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {/* Las de detrás, para que se vea que hay más. Solo decorado. */}
        {cartas.slice(1, 3).map((c, i) => (
          <div
            key={c.gooal.id}
            aria-hidden
            style={{
              position: 'absolute', inset: 0, borderRadius: 18, overflow: 'hidden',
              border: '1px solid #2A2E2C', background: '#161817',
              transform: `scale(${0.955 - i * 0.04}) translateY(${11 + i * 11}px)`,
              opacity: 0.5 - i * 0.25,
            }}
          >
            {c.gooal.imagen_url && (
              // eslint-disable-next-line @next/next/no-img-element -- fotos del catálogo de tamaño variable
              <img src={c.gooal.imagen_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>
        ))}

        <div
          onPointerDown={alEmpezar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          style={{
            position: 'absolute', inset: 0, borderRadius: 18, overflow: 'hidden',
            border: '1px solid #2A2E2C', background: '#161817', touchAction: 'pan-y',
            transform: `translateX(${saliendo ? fueraX : arrastre}px) rotate(${saliendo ? (fueraX / 40) : inclinacion}deg)`,
            transition: arrastrando.current === null ? 'transform 0.18s ease-out' : 'none',
            cursor: 'grab',
          }}
        >
          {gooal.imagen_url && (
            // eslint-disable-next-line @next/next/no-img-element -- fotos del catálogo de tamaño variable
            <img
              src={gooal.imagen_url}
              alt=""
              draggable={false}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}

          {/* Lo que vas a hacer, mientras arrastras. */}
          {arrastre !== 0 && !saliendo && (
            <span
              aria-hidden
              style={{
                position: 'absolute', top: 18, left: arrastre > 0 ? 18 : undefined, right: arrastre < 0 ? 18 : undefined,
                padding: '6px 12px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                border: `2px solid ${arrastre > 0 ? '#00D1A7' : '#FF5252'}`,
                color: arrastre > 0 ? '#00D1A7' : '#FF5252',
                background: 'rgba(11,11,11,0.55)',
                opacity: Math.min(1, Math.abs(arrastre) / UMBRAL),
              }}
            >
              {arrastre > 0 ? 'A MI LISTA' : 'PASO'}
            </span>
          )}

          <div
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0, padding: '64px 16px 14px',
              background: 'linear-gradient(to top, rgba(4,5,5,0.97) 30%, rgba(4,5,5,0.6) 70%, rgba(4,5,5,0))',
            }}
          >
            <h2
              className="fuente-titular"
              style={{ fontSize: 19, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.25 }}
            >
              {gooal.titulo}
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8, fontSize: 12, color: '#9AA8A4' }}>
              <span style={{
                fontSize: 11, fontWeight: 700, color: '#00D1A7',
                background: 'rgba(0,209,167,0.14)', border: '1px solid rgba(0,209,167,0.36)',
                borderRadius: 20, padding: '3px 9px',
              }}>
                {gooal.puntos} {gooal.puntos === 1 ? 'pt' : 'pts'}
              </span>
              <span>{CATEGORIA_LABEL[gooal.categoria]}</span>
              {lugar && <><span aria-hidden>·</span><span>{lugar}</span></>}
            </div>

            {/* Solo si hay alguien. Un "0 personas lo tienen pendiente · 0 ya lo
                hizo" en cada carta hace que la app parezca abandonada. */}
            {(pendientes > 0 || conseguidos > 0) && (
              <p style={{ fontSize: 11.5, color: '#7E8C88', marginTop: 10, paddingTop: 9, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                {pendientes > 0 && (
                  <><b style={{ color: '#F5F5F2', fontWeight: 600 }}>{pendientes}</b> {pendientes === 1 ? 'lo tiene' : 'lo tienen'} pendiente</>
                )}
                {pendientes > 0 && conseguidos > 0 && ' · '}
                {conseguidos > 0 && (
                  <><b style={{ color: '#F5F5F2', fontWeight: 600 }}>{conseguidos}</b> ya {conseguidos === 1 ? 'lo hizo' : 'lo hicieron'}</>
                )}
              </p>
            )}

            <div style={{ marginTop: 2 }}>
              <CreditoFoto autor={gooal.foto_autor} licencia={gooal.foto_licencia} origen={gooal.foto_origen} />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-[#FF5252] bg-[rgba(255,82,82,0.14)] px-3 py-2 rounded-lg" style={{ marginTop: 10 }}>{error}</p>
      )}

      {/* ── Las tres salidas, CON SU NOMBRE DEBAJO ─────────
          Tres iconos a secas no se distinguen: un corazón y un check pueden ser
          lo mismo para quien llega. Y una de las tres DA PUNTOS, que es la que
          más cuesta deshacer; ésa no puede depender de adivinar. */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', justifyContent: 'center', padding: '14px 0 0' }}>
        <Boton etiqueta="Paso" onClick={() => resolver('paso')} ocupado={ocupado}>
          <X aria-hidden style={{ width: 20, height: 20 }} />
        </Boton>
        <Boton etiqueta="A mi lista" principal onClick={() => resolver('lista')} ocupado={ocupado}>
          <Heart aria-hidden style={{ width: 23, height: 23 }} />
        </Boton>
        <Boton etiqueta="Ya lo hice" hecho onClick={() => resolver('hecho')} ocupado={ocupado}>
          <Check aria-hidden style={{ width: 20, height: 20 }} />
        </Boton>
      </div>

    </div>
  )
}

function Boton({
  children, etiqueta, principal, hecho, onClick, ocupado,
}: {
  children: React.ReactNode
  etiqueta: string
  principal?: boolean
  hecho?: boolean
  onClick: () => void
  ocupado: boolean
}) {
  const lado = principal ? 60 : 50
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 72 }}>
      <button
        onClick={onClick}
        disabled={ocupado}
        aria-label={etiqueta}
        className="active:opacity-70 transition-opacity disabled:opacity-40"
        style={{
          width: lado, height: lado, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: principal ? '#00D1A7' : '#1E2120',
          border: `1px solid ${principal ? '#00D1A7' : hecho ? 'rgba(0,209,167,0.45)' : '#2A2E2C'}`,
          color: principal ? '#042019' : hecho ? '#00D1A7' : '#8B9A95',
        }}
      >
        {children}
      </button>
      <span aria-hidden style={{ fontSize: 10.5, color: hecho ? '#00D1A7' : '#7A8A85', whiteSpace: 'nowrap' }}>
        {etiqueta}
      </span>
    </div>
  )
}
