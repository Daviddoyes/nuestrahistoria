'use client'

import { useState, useRef } from 'react'
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
  const touchStartY = useRef(0)
  const touchCurrentY = useRef(0)

  const close = () => {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, 260)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentY.current = e.touches[0].clientY
  }

  const handleTouchEnd = () => {
    const delta = touchCurrentY.current - touchStartY.current
    if (delta > 80) close()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0A0A0A]"
      style={{ height: '100dvh' }}
      onClick={e => e.target === e.currentTarget && close()}
    >
      <div
        className={`flex flex-col h-full ${closing ? 'modal-slide-down' : 'modal-slide-up'}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Close button */}
        <button
          onClick={close}
          aria-label="Cerrar"
          className="absolute right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white/50 active:bg-white/20 active:text-white transition-colors"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Photo */}
        <div
          className="w-full flex-shrink-0"
          style={{ background: '#000', maxHeight: '55vh', minHeight: plan.foto_url ? '40vw' : 0 }}
        >
          {plan.foto_url && (
            <img
              src={plan.foto_url}
              alt={plan.titulo}
              style={{
                width: '100%',
                height: '100%',
                maxHeight: '55vh',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          )}
        </div>

        {/* Scrollable content */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="px-6 pt-6 pb-10">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#C9B99A] mb-3">
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
      </div>
    </div>
  )
}
