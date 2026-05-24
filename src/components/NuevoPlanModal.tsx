'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

type Props = {
  onClose: () => void
  onSubmit: (titulo: string, descripcion: string | null) => Promise<void>
}

export default function NuevoPlanModal({ onClose, onSubmit }: Props) {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) return
    setLoading(true)
    setError('')
    try {
      await onSubmit(titulo.trim(), descripcion.trim() || null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el plan'
      setError(msg)
      console.error('[NuevoPlanModal]', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full bg-[#141414] rounded-t-2xl shadow-2xl overflow-hidden">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 bg-[#2A2A2A] rounded-full" />
        </div>

        <div className="px-5 py-3 flex items-center justify-between">
          <h2 className="font-serif font-semibold text-[#F0F0F0] text-base">Nuevo plan</h2>
          <button
            onClick={onClose}
            className="text-[#444444] active:text-[#F0F0F0] w-8 h-8 flex items-center justify-center rounded-lg active:bg-[#1A1A1A] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-1.5">
              Titulo
            </label>
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ej: Ver el atardecer en la playa"
              className="w-full px-4 py-3.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#E8692A] text-base"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-1.5">
              Descripcion{' '}
              <span className="text-[#444444] normal-case tracking-normal">(opcional)</span>
            </label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Añade mas detalles..."
              rows={3}
              className="w-full px-4 py-3.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#E8692A] resize-none text-base"
            />
          </div>

          {error && (
            <p className="text-sm text-[#C97B7B] bg-[#8B3A3A]/20 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div
            className="flex gap-3"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl border border-[#2A2A2A] text-[#666666] active:bg-[#1A1A1A] transition-colors text-sm font-medium min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!titulo.trim() || loading}
              className="flex-1 bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-30 disabled:cursor-not-allowed text-white py-3.5 rounded-xl transition-colors text-sm font-semibold min-h-[44px]"
            >
              {loading ? 'Guardando...' : 'Añadir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
