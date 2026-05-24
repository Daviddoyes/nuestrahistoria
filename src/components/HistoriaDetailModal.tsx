'use client'

import { useState } from 'react'
import { X, Calendar, User } from 'lucide-react'
import type { Plan } from '@/types/planes'

type Props = {
  plan: Plan
  onClose: () => void
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function HistoriaDetailModal({ plan, onClose }: Props) {
  const [closing, setClosing] = useState(false)

  const close = () => {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, 260)
  }

  return (
    <>
      {/* X button — fixed, outside scroll, always visible */}
      <button
        onClick={close}
        aria-label="Cerrar"
        className="fixed right-4 z-[60] w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white/60 active:bg-black/70 active:text-white transition-colors"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <X className="w-4 h-4" />
      </button>

      {/* Single scroll container — everything flows naturally inside */}
      <div
        className={`fixed inset-0 z-50 bg-[#0A0A0A] ${closing ? 'modal-slide-down' : 'modal-slide-up'}`}
        style={{
          overflowY: 'scroll',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        } as React.CSSProperties}
      >
        {/* Photo — full width, natural height, black bg */}
        <div style={{ background: '#000' }}>
          {plan.foto_url ? (
            <img
              src={plan.foto_url}
              alt={plan.titulo}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          ) : (
            <div style={{ height: '30vw', background: '#111' }} />
          )}
        </div>

        {/* Content — normal flow below the photo */}
        <div
          className="px-6 pt-6"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4rem)' }}
        >
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#E8692A] mb-3">
            Historia
          </p>

          <h2 className="font-serif text-2xl font-bold text-[#F0F0F0] leading-snug mb-5">
            {plan.titulo}
          </h2>

          <div className="flex flex-col gap-2 mb-6">
            <span className="flex items-center gap-2 text-[11px] text-[#666666] uppercase tracking-[0.1em]">
              <User className="w-3 h-3 flex-shrink-0" />
              {plan.creado_por}
            </span>
            <span className="flex items-center gap-2 text-[11px] text-[#666666] uppercase tracking-[0.1em]">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              {formatDate(plan.created_at)}
            </span>
          </div>

          {plan.historia_descripcion && (
            <>
              <div className="h-px w-full bg-[#2A2A2A] mb-6" />
              <p className="text-[#A0A0A0] text-base leading-relaxed">
                {plan.historia_descripcion}
              </p>
            </>
          )}
        </div>
      </div>
    </>
  )
}
