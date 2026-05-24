'use client'

import { useState } from 'react'
import { Calendar, User, Trash2 } from 'lucide-react'
import type { Plan } from '@/types/planes'
import HistoriaDetailModal from './HistoriaDetailModal'

type Props = {
  plan: Plan
  onDelete: () => void
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function HistoriaCard({ plan, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  return (
    <>
      <div
        className="relative rounded-xl overflow-hidden border border-[#2A2A2A] aspect-[3/4] cursor-pointer"
        style={{ background: '#000' }}
        onClick={() => !confirming && setShowDetail(true)}
      >
        {plan.foto_url ? (
          <img
            src={plan.foto_url}
            alt={plan.titulo}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: '#141414' }} />
        )}

        {/* Gradient for text readability */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />

        {/* Trash button — top right */}
        <button
          onClick={e => { e.stopPropagation(); setConfirming(true) }}
          aria-label="Eliminar historia"
          className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center text-white/30 active:bg-[#8B3A3A]/80 active:text-white transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* Text overlay */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <span className="text-[#E8692A]/60 text-[10px] uppercase tracking-widest font-medium block mb-1.5">
            Historia
          </span>
          <h3 className="font-serif font-semibold text-white text-base leading-snug mb-1.5">
            {plan.titulo}
          </h3>
          {plan.historia_descripcion && (
            <p className="text-white/60 text-xs leading-relaxed mb-2.5 line-clamp-2">
              {plan.historia_descripcion}
            </p>
          )}
          <div className="flex flex-col gap-0.5 text-[10px] text-white/35">
            <span className="flex items-center gap-1">
              <User className="w-2.5 h-2.5" />
              {plan.creado_por}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" />
              {formatDate(plan.created_at)}
            </span>
          </div>
        </div>

        {/* Confirmation overlay */}
        {confirming && (
          <div
            className="absolute inset-0 z-20 bg-black/85 flex flex-col items-center justify-center gap-4 p-5"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-white text-sm font-medium text-center">
              ¿Eliminar esta historia?
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#2A2A2A] text-[#666666] text-sm font-medium active:bg-[#1A1A1A] min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setConfirming(false); onDelete() }}
                className="flex-1 py-2.5 rounded-xl bg-[#8B3A3A] active:bg-[#7A2A2A] text-white text-sm font-medium min-h-[44px]"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}
      </div>

      {showDetail && (
        <HistoriaDetailModal
          plan={plan}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  )
}
