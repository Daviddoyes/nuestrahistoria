'use client'

import { useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import type { Plan } from '@/types/planes'

type Props = {
  plan: Plan
  onCompletar: () => void
  onDelete: () => void
}

export default function PlanCard({ plan, onCompletar, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] p-4 transition-colors"
      style={{ borderLeft: '2px solid #E8692A' }}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Content */}
        <div className="flex-1 min-w-0 py-0.5">
          <h3 className="font-serif font-semibold text-[#F0F0F0] text-base leading-snug mb-1.5">
            {plan.titulo}
          </h3>
          {plan.descripcion && (
            <p className="text-[#666666] text-sm leading-relaxed mb-2">
              {plan.descripcion}
            </p>
          )}
          <p className="text-[10px] text-[#666666] uppercase tracking-[0.1em]">{plan.creado_por}</p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={onCompletar}
            aria-label="Marcar como hecho"
            className="w-11 h-11 rounded-xl border border-[#2A2A2A] flex items-center justify-center text-[#444444] active:bg-[#E8692A] active:text-white active:border-[#E8692A] transition-colors"
          >
            <Check className="w-5 h-5" />
          </button>
          <button
            onClick={() => setConfirming(true)}
            aria-label="Eliminar plan"
            className="w-11 h-11 rounded-xl border border-[#2A2A2A] flex items-center justify-center text-[#444444] active:bg-[#8B3A3A]/20 active:text-[#C97B7B] active:border-[#8B3A3A]/40 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Inline confirmation strip */}
      {confirming && (
        <div className="mt-3 pt-3 border-t border-[#2A2A2A] flex items-center justify-between gap-3">
          <p className="text-sm text-[#666666]">¿Eliminar este plan?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#666666] border border-[#2A2A2A] active:bg-[#1A1A1A] min-h-[36px]"
            >
              Cancelar
            </button>
            <button
              onClick={() => { setConfirming(false); onDelete() }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-[#8B3A3A] active:bg-[#7A2A2A] min-h-[36px]"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
