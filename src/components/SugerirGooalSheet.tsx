'use client'

import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { sugerirGooal } from '@/lib/actions'
import {
  CATEGORIAS, CATEGORIA_LABEL, CATEGORIA_EMOJI, type CategoriaGooal,
} from '@/lib/gooals'

type Props = {
  /** Lo que el usuario tenía escrito en el buscador cuando no encontró nada. */
  tituloInicial?: string
  categoriaInicial?: CategoriaGooal | null
  onClose: () => void
}

/**
 * Propone un gooal que falta en el catálogo.
 *
 * Solo pide título y categoría: la dificultad la decide el admin al aprobar,
 * que es donde está el criterio de puntos. Nada de esto se publica al momento —
 * queda pendiente de moderación.
 */
export default function SugerirGooalSheet({
  tituloInicial = '', categoriaInicial = null, onClose,
}: Props) {
  const [titulo, setTitulo] = useState(tituloInicial)
  const [categoria, setCategoria] = useState<CategoriaGooal | null>(categoriaInicial)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)

  const puedeEnviar = titulo.trim().length >= 6 && categoria !== null && !enviando

  const enviar = async () => {
    if (!puedeEnviar || !categoria) return
    setEnviando(true)
    setError('')
    try {
      const res = await sugerirGooal(titulo, categoria)
      if (res.ok) setEnviado(true)
      else setError(res.error ?? 'No hemos podido guardar tu sugerencia.')
    } catch (e) {
      console.error('[sugerir]', e)
      setError('No hemos podido guardar tu sugerencia.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Sugerir un gooal"
        style={{
          width: '100%', background: '#141414',
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          padding: '18px 16px calc(18px + env(safe-area-inset-bottom))',
          maxHeight: '85vh', overflowY: 'auto',
        }}
      >
        <div className="flex items-start justify-between" style={{ marginBottom: 4 }}>
          <p style={{ fontSize: 17, fontWeight: 600, color: '#F0F0F0' }}>
            {enviado ? '¡Gracias!' : 'Sugerir un gooal'}
          </p>
          <button onClick={onClose} aria-label="Cerrar" style={{ padding: 6, color: '#666666' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {enviado ? (
          <div className="flex flex-col items-center gap-3" style={{ padding: '24px 8px 12px' }}>
            <div
              style={{
                width: 52, height: 52, borderRadius: 999, background: 'rgba(29,233,182,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Check className="w-7 h-7" style={{ color: '#1DE9B6' }} strokeWidth={2.5} />
            </div>
            <p style={{ fontSize: 14, color: '#C0C0C0', textAlign: 'center', lineHeight: 1.5 }}>
              La revisamos y, si encaja, la verás en el catálogo.
            </p>
            <button
              onClick={onClose}
              className="mt-2 w-full rounded-xl active:opacity-80 transition-opacity"
              style={{ padding: '13px', fontSize: 15, fontWeight: 600, color: '#0A0A0A', background: '#1DE9B6' }}
            >
              Listo
            </button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: '#666666', lineHeight: 1.5, marginBottom: 16 }}>
              Dinos qué experiencia falta. La revisamos a mano antes de publicarla.
            </p>

            <label style={etiqueta}>El gooal</label>
            <textarea
              value={titulo}
              onChange={e => setTitulo(e.target.value.slice(0, 160))}
              rows={2}
              placeholder="Ver un eclipse total de sol"
              className="w-full rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#1DE9B6] text-base"
              style={{ padding: '11px 13px', resize: 'none' }}
            />
            <p style={{ fontSize: 11, color: '#444444', marginTop: 5, textAlign: 'right' }}>
              {titulo.trim().length}/160
            </p>

            <label style={{ ...etiqueta, marginTop: 12 }}>Categoría</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS.map(c => {
                const activo = categoria === c
                return (
                  <button
                    key={c}
                    onClick={() => setCategoria(c)}
                    aria-pressed={activo}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '8px 13px', borderRadius: 999, fontSize: 13, fontWeight: 500,
                      border: `1px solid ${activo ? '#1DE9B6' : '#2A2A2A'}`,
                      background: activo ? 'rgba(29,233,182,0.12)' : 'transparent',
                      color: activo ? '#1DE9B6' : '#888888',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span>{CATEGORIA_EMOJI[c]}</span> {CATEGORIA_LABEL[c]}
                  </button>
                )
              })}
            </div>

            {error && (
              <p className="text-sm text-[#C97B7B] bg-[#8B3A3A]/20 rounded-lg" style={{ padding: '9px 12px', marginTop: 14 }}>
                {error}
              </p>
            )}

            <button
              onClick={enviar}
              disabled={!puedeEnviar}
              className="w-full rounded-xl active:opacity-80 transition-opacity"
              style={{
                marginTop: 18, padding: '14px', fontSize: 15, fontWeight: 600,
                color: puedeEnviar ? '#0A0A0A' : '#555555',
                background: puedeEnviar ? '#1DE9B6' : '#1F1F1F',
                cursor: puedeEnviar ? 'pointer' : 'default',
              }}
            >
              {enviando ? 'Enviando...' : 'Enviar sugerencia'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const etiqueta: React.CSSProperties = {
  display: 'block', fontSize: 11, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: '#666666', marginBottom: 8,
}
