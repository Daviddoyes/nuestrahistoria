'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import PlanWizard from './PlanWizard'

type Props = {
  onClose: () => void
  /** Devuelve el id del plan creado (o null) para lanzar el wizard. */
  onSubmit: (titulo: string, descripcion: string, invitadoIds: string[]) => Promise<string | null>
}

export default function NuevoPlanModal({ onClose, onSubmit }: Props) {
  const [titulo, setTitulo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [planCreado, setPlanCreado] = useState<{ id: string; titulo: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) return
    setLoading(true)
    setError('')
    try {
      // Ni descripción ni invitados aquí: el plan nace solo con título y el
      // resto (fecha, con quién) se configura en el PlanWizard.
      const planId = await onSubmit(titulo.trim(), '', [])
      if (planId) setPlanCreado({ id: planId, titulo: titulo.trim() })
      else onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el plan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onPointerDown={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full bg-[#141414] rounded-t-2xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-9 h-1 bg-[#2A2A2A] rounded-full" />
        </div>

        <div className="px-5 py-3 flex items-center justify-between flex-shrink-0">
          <h2 className=" font-semibold text-[#F0F0F0] text-base">Nuevo plan</h2>
          <button
            onClick={onClose}
            className="text-[#444444] active:text-[#F0F0F0] w-10 h-10 flex items-center justify-center rounded-lg active:bg-[#1A1A1A]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-1.5">
              Título
            </label>
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="¿Qué quieres vivir?"
              className="w-full px-4 py-3.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#1DE9B6] text-base"
              autoFocus
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
              className="flex-1 py-3.5 rounded-xl border border-[#2A2A2A] text-[#666666] active:bg-[#1A1A1A] text-sm font-medium min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!titulo.trim() || loading}
              className="flex-1 bg-[#1DE9B6] active:bg-[#00BFA5] disabled:opacity-30 disabled:cursor-not-allowed text-[#0A0A0A] py-3.5 rounded-xl text-sm font-semibold min-h-[44px]"
            >
              {loading ? 'Guardando...' : 'Guardar plan'}
            </button>
          </div>
        </form>
      </div>

      {planCreado && (
        <PlanWizard
          planId={planCreado.id}
          planTitulo={planCreado.titulo}
          onClose={() => {
            setPlanCreado(null)
            onClose()
          }}
        />
      )}
    </div>
  )
}
