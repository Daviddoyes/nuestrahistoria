'use client'

import { useState, useEffect, useMemo } from 'react'
import { Check, Trash2 } from 'lucide-react'
import type { Plan } from '@/types/planes'
import SharePlanImage from './SharePlanImage'
import { createClient } from '@/lib/supabase/client'

type Participante = { nombre_usuario: string | null; foto_url: string | null; estado: string }

type Props = {
  plan: Plan
  onCompletar: () => void
  onDelete: () => void
}

function MiniAvatar({ p, size = 22 }: { p: Participante; size?: number }) {
  const initial = p.nombre_usuario?.[0]?.toUpperCase() ?? '?'
  if (p.foto_url) {
    return (
      <img
        src={p.foto_url}
        alt=""
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #0A0A0A', flexShrink: 0 }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: '#2A2A2A', border: '1.5px solid #0A0A0A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 700, color: '#888888', flexShrink: 0,
    }}>
      {initial}
    </div>
  )
}

const borderColor = (conQuien: string) => conQuien === 'solo' ? '#555555' : '#E8692A'

export default function PlanCard({ plan, onCompletar, onDelete }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [confirming, setConfirming] = useState(false)
  const [participantes, setParticipantes] = useState<Participante[]>([])

  useEffect(() => {
    supabase
      .from('plan_participantes' as never)
      .select('nombre_usuario, foto_url, estado')
      .eq('plan_id', plan.id)
      .then(({ data }) => {
        if (data) setParticipantes(data as Participante[])
      })
  }, [plan.id, supabase])

  const visibles = participantes.slice(0, 3)
  const extra = participantes.length - 3

  return (
    <div
      className="relative bg-[#141414] rounded-xl border border-[#2A2A2A] p-4 transition-colors"
      style={{ borderLeft: `3px solid ${borderColor(plan.con_quien ?? 'todos')}` }}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Content */}
        <div className="flex-1 min-w-0 py-0.5">
          <h3 className="font-medium text-[#F0F0F0] text-[15px] tracking-[-0.01em] leading-[1.5] mb-1.5">
            {plan.titulo}
          </h3>
          {plan.descripcion && (
            <p className="text-[#666666] text-sm leading-relaxed mb-2">{plan.descripcion}</p>
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

      {/* Bottom row: participant avatars + share button */}
      {!confirming && (
        <div className="flex items-center justify-between mt-2">
          {/* Participant avatars */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {visibles.map((p, i) => (
              <div key={i} style={{ marginLeft: i === 0 ? 0 : -6, zIndex: visibles.length - i }}>
                <MiniAvatar p={p} />
              </div>
            ))}
            {extra > 0 && (
              <div style={{
                marginLeft: -6, width: 22, height: 22, borderRadius: '50%',
                background: '#2A2A2A', border: '1.5px solid #0A0A0A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, fontWeight: 700, color: '#666666',
              }}>
                +{extra}
              </div>
            )}
          </div>
          <SharePlanImage plan={plan} />
        </div>
      )}

      {/* Inline delete confirmation */}
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
