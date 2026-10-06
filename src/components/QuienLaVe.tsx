'use client'

import { Lock, Users, Globe, X } from 'lucide-react'
import type { VisibilidadFoto } from '@/types/gooals'

/**
 * Quién puede ver una foto, dicho como lo diría una persona.
 *
 * En la base la columna se llama `visibilidad` y sus valores son `privada`,
 * `amigos` y `publica`. ESAS PALABRAS NO SALEN EN LA PANTALLA. "Visibilidad" no
 * es una palabra que nadie use para esto, y "privada" se entiende de varias
 * maneras; "Solo yo" no tiene vuelta de hoja. La traducción vive aquí y en
 * ningún otro sitio.
 *
 * Nace en "Mis amigos" a propósito: es lo que la gente espera de una foto suya
 * en una app con seguidores, y es lo que ya guarda la base por defecto. Quien no
 * mire esto se queda en lo prudente, no en lo abierto.
 */
export const QUIEN_LA_VE: {
  valor: VisibilidadFoto
  titulo: string
  explicacion: string
  Icono: typeof Lock
}[] = [
  {
    valor: 'privada',
    titulo: 'Solo yo',
    explicacion: 'No la ve nadie más.',
    Icono: Lock,
  },
  {
    valor: 'amigos',
    titulo: 'Mis amigos',
    explicacion: 'Las personas a las que sigues y que también te siguen.',
    Icono: Users,
  },
  {
    valor: 'publica',
    titulo: 'Todo el mundo',
    explicacion: 'Cualquiera que entre en tu perfil o en el muro.',
    Icono: Globe,
  },
]

/** La palabra suelta, para el botoncito que va encima de la foto. */
export function palabraQuienLaVe(valor: VisibilidadFoto): string {
  return QUIEN_LA_VE.find(o => o.valor === valor)?.titulo ?? 'Mis amigos'
}

/** El icono suelto, para lo mismo. */
export function iconoQuienLaVe(valor: VisibilidadFoto) {
  return (QUIEN_LA_VE.find(o => o.valor === valor) ?? QUIEN_LA_VE[1]).Icono
}

type PropsSelector = {
  valor: VisibilidadFoto
  onCambiar: (valor: VisibilidadFoto) => void
  ocupado?: boolean
}

/** Las tres opciones, una debajo de otra. Se usa al subir y al cambiarla luego. */
export function SelectorQuienLaVe({ valor, onCambiar, ocupado = false }: PropsSelector) {
  return (
    <div role="radiogroup" aria-label="Quién puede ver esta foto" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {QUIEN_LA_VE.map(({ valor: v, titulo, explicacion, Icono }) => {
        const elegida = v === valor
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={elegida}
            disabled={ocupado}
            onClick={() => onCambiar(v)}
            className="transition-colors disabled:opacity-60"
            style={{
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
              width: '100%', minHeight: 56, padding: '10px 14px', borderRadius: 14,
              background: elegida ? 'rgba(0,209,167,0.12)' : '#2A2E2C',
              border: `1px solid ${elegida ? '#00D1A7' : '#2A2E2C'}`,
            }}
          >
            <Icono
              aria-hidden
              style={{ width: 18, height: 18, flexShrink: 0, color: elegida ? '#00D1A7' : '#A3B1AC' }}
            />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: elegida ? '#00D1A7' : '#FFFFFF' }}>
                {titulo}
              </span>
              <span style={{ display: 'block', fontSize: 12, color: '#7A8A85', lineHeight: 1.35, marginTop: 1 }}>
                {explicacion}
              </span>
            </span>
            {/* La marca de elegida va al final y es un círculo, no un check: con
                tres filas seguidas, un check en cada una se confunde con "hecho". */}
            <span
              aria-hidden
              style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${elegida ? '#00D1A7' : '#7A8A85'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {elegida && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00D1A7' }} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

type PropsHoja = {
  valor: VisibilidadFoto
  guardando: boolean
  error?: string
  onElegir: (valor: VisibilidadFoto) => void
  onCerrar: () => void
}

/**
 * La misma elección, en una hoja que sube desde abajo, para cambiarla cuando la
 * foto ya está subida.
 *
 * Se guarda al tocar la opción, sin botón de confirmar: es un cambio de una sola
 * cosa y reversible en el mismo sitio. Un "Guardar" aquí solo añadiría un toque
 * y la duda de si se ha guardado.
 */
export function HojaQuienLaVe({ valor, guardando, error, onElegir, onCerrar }: PropsHoja) {
  return (
    <div
      role="dialog"
      aria-label="Quién puede ver esta foto"
      // Por encima de la ficha (z-60) y de su botón de cerrar (z-70).
      className="fixed inset-0 z-[85] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && !guardando && onCerrar()}
    >
      <div className="w-full bg-[#1E2120] rounded-t-2xl shadow-2xl animate-[modal-slide-up_0.25s_ease-out]">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 bg-[#2A2E2C] rounded-full" />
        </div>

        <div className="px-5 py-3 flex items-center justify-between">
          <h2 className="fuente-titular font-semibold text-[#FFFFFF] text-base">¿Quién puede ver esta foto?</h2>
          <button
            onClick={onCerrar}
            disabled={guardando}
            aria-label="Cerrar"
            className="text-[#7A8A85] active:text-[#FFFFFF] w-8 h-8 flex items-center justify-center rounded-lg active:bg-[#2A2E2C] transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}>
          <SelectorQuienLaVe valor={valor} onCambiar={onElegir} ocupado={guardando} />
          {error && (
            <p role="alert" className="mt-3 text-sm text-[#FF5252] bg-[rgba(255,82,82,0.14)] px-3 py-2 rounded-lg">{error}</p>
          )}
          <p style={{ fontSize: 12, color: '#7A8A85', marginTop: 12, lineHeight: 1.45 }}>
            Puedes cambiarlo cuando quieras desde la propia foto.
          </p>
        </div>
      </div>
    </div>
  )
}
