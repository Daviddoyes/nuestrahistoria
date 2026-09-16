'use client'

import { useEffect, useId, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

type Props = {
  titulo: string
  onCerrar: () => void
  /** Mientras algo está en marcha no se puede cerrar: cerrar no pararía lo que ya se está haciendo. */
  ocupado?: boolean
  children: React.ReactNode
  /**
   * El botón de la acción, que va a la DERECHA. Si no se pasa, no hay pie: se
   * cierra con la X (formularios que llevan sus propios botones dentro).
   */
  accion?: React.ReactNode
  /** Avisos o errores que tienen que verse siempre, pegados a los botones. */
  aviso?: React.ReactNode
  textoCancelar?: string
  ancho?: number
}

// ── Alto visible de verdad ────────────────────────────────────────
// Con el teclado del móvil abierto, la pantalla "útil" es la mitad. 100vh y
// 100dvh no se enteran; visualViewport sí. El diálogo se ajusta a ese hueco para
// que los botones no queden debajo del teclado.
function suscribirVista(avisar: () => void) {
  const v = window.visualViewport
  if (!v) return () => {}
  v.addEventListener('resize', avisar)
  v.addEventListener('scroll', avisar)
  return () => { v.removeEventListener('resize', avisar); v.removeEventListener('scroll', avisar) }
}
const vistaActual = () => {
  const v = window.visualViewport
  return v ? `${Math.round(v.height)}|${Math.round(v.offsetTop)}` : ''
}
const vistaServidor = () => ''

// En el servidor no hay document al que llevar el diálogo. Con esto, al hidratar se
// pinta primero lo mismo que en el servidor (nada) y justo después el diálogo,
// en vez de dar un aviso de que servidor y navegador no coinciden.
const sinSuscripcion = () => () => {}
const enNavegador = () => true
const enServidor = () => false

/** Lo que se puede alcanzar con el tabulador dentro del diálogo. */
const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Diálogo del panel. Todo lo que evita quedarse atrapado vive aquí, una sola vez:
 *   - la X y Cancelar se ven siempre: si el contenido no cabe, se desplaza el
 *     contenido, nunca los botones;
 *   - Escape y pulsar fuera cierran;
 *   - Cancelar a la izquierda y la acción a la derecha, y el foco empieza en
 *     Cancelar: un Intro sin mirar nunca confirma;
 *   - mientras está abierto, lo de detrás queda inerte: ni el tabulador ni un
 *     lector de pantalla llegan a ello.
 */
export default function DialogoPanel({ titulo, onCerrar, ocupado = false, children, accion, aviso, textoCancelar = 'Cancelar', ancho = 440 }: Props) {
  const idTitulo = useId()
  const fondo = useRef<HTMLDivElement>(null)
  const caja = useRef<HTMLDivElement>(null)
  const cancelar = useRef<HTMLButtonElement>(null)
  const cerrarX = useRef<HTMLButtonElement>(null)
  const pulsadoEnFondo = useRef(false)
  const vista = useSyncExternalStore(suscribirVista, vistaActual, vistaServidor)
  const montado = useSyncExternalStore(sinSuscripcion, enNavegador, enServidor)
  const [altoVisible, desdeArriba] = vista ? vista.split('|').map(Number) : [null, 0]

  // La última versión de onCerrar y ocupado, sin volver a montar los efectos de abajo en cada render.
  const cerrarRef = useRef(onCerrar)
  const ocupadoRef = useRef(ocupado)
  useEffect(() => { cerrarRef.current = onCerrar; ocupadoRef.current = ocupado })

  // Al abrir: lo de detrás inerte, sin desplazarse, y el foco en Cancelar (o en la X).
  // Al cerrar: todo como estaba, y el foco vuelve al botón que abrió el diálogo.
  useEffect(() => {
    if (!montado) return
    const previo = document.activeElement as HTMLElement | null
    const hermanos = Array.from(document.body.children).filter(el => el !== fondo.current && !el.hasAttribute('inert'))
    hermanos.forEach(el => el.setAttribute('inert', ''))
    const scrollPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ;(cancelar.current ?? cerrarX.current)?.focus()
    return () => {
      hermanos.forEach(el => el.removeAttribute('inert'))
      document.body.style.overflow = scrollPrevio
      previo?.focus?.()
    }
  }, [montado])

  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (!ocupadoRef.current) cerrarRef.current()
        return
      }
      // El tabulador da la vuelta dentro del diálogo en vez de salirse de él.
      if (e.key === 'Tab' && caja.current) {
        const enfocables = Array.from(caja.current.querySelectorAll<HTMLElement>(ENFOCABLES))
        if (enfocables.length === 0) { e.preventDefault(); return }
        const primero = enfocables[0]
        const ultimo = enfocables[enfocables.length - 1]
        const dentro = caja.current.contains(document.activeElement)
        if (e.shiftKey && (document.activeElement === primero || !dentro)) { e.preventDefault(); ultimo.focus() }
        else if (!e.shiftKey && (document.activeElement === ultimo || !dentro)) { e.preventDefault(); primero.focus() }
      }
    }
    document.addEventListener('keydown', alPulsar)
    return () => document.removeEventListener('keydown', alPulsar)
  }, [])

  if (!montado) return null

  return createPortal(
    <div
      ref={fondo}
      // Se cierra solo si el clic EMPIEZA y ACABA en el fondo: seleccionar texto
      // dentro y soltar fuera no debe cerrar el diálogo.
      onMouseDown={e => { pulsadoEnFondo.current = e.target === e.currentTarget }}
      onClick={e => { if (pulsadoEnFondo.current && e.target === e.currentTarget && !ocupado) onCerrar() }}
      style={{
        position: 'fixed', left: 0, right: 0, zIndex: 100,
        top: desdeArriba, height: altoVisible ?? '100dvh',
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 12,
      }}
    >
      <div
        ref={caja}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        style={{
          width: '100%', maxWidth: ancho, maxHeight: '100%',
          display: 'flex', flexDirection: 'column',
          background: '#161817', border: '1px solid #2A2E2C', borderRadius: 16, overflow: 'hidden',
        }}
      >
        {/* Cabecera fija: el título y la X no se van nunca. */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px 0 20px' }}>
          <p id={idTitulo} className="fuente-titular" style={{ flex: 1, minWidth: 0, fontSize: 18, fontWeight: 600, color: '#FFFFFF', paddingBlock: 10 }}>
            {titulo}
          </p>
          <button
            ref={cerrarX}
            type="button"
            onClick={onCerrar}
            disabled={ocupado}
            aria-label="Cerrar"
            style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A3B1AC', background: 'rgba(255,255,255,0.06)', opacity: ocupado ? 0.4 : 1 }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Lo único que se desplaza si no cabe. */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 20px 16px', fontSize: 14, lineHeight: 1.6, color: '#A3B1AC' }}>
          {children}
        </div>

        {accion && (
          <div style={{ flexShrink: 0, borderTop: '1px solid #2A2E2C', padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}>
            {aviso}
            {/* Cancelar SIEMPRE a la izquierda y la acción a la derecha, en móvil y en escritorio. */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                ref={cancelar}
                type="button"
                onClick={onCerrar}
                disabled={ocupado}
                style={{ flex: 1, minHeight: 46, borderRadius: 10, border: '1px solid #3A3F3D', background: '#2A2E2C', color: '#FFFFFF', fontSize: 14, fontWeight: 600, opacity: ocupado ? 0.5 : 1 }}
              >
                {textoCancelar}
              </button>
              <div style={{ flex: 1, display: 'flex' }}>{accion}</div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
