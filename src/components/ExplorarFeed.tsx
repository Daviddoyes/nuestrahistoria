'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Check, Compass } from 'lucide-react'
import { getPlanesPublicos, copiarPlan } from '@/lib/actions'
import SugerenciasIA from './SugerenciasIA'
import CercaDeTi from './CercaDeTi'
import type { PlanExplorar, Plan, Profile } from '@/types/planes'

const CATEGORIAS = ['Todos', 'Viajes', 'Deporte', 'Gastronomía', 'Cultura', 'Aventura'] as const

type Props = {
  profile: Profile
  pendientes: Plan[]
  historias: Plan[]
  onOpenPlan: (plan: PlanExplorar) => void
  /** Se llama tras copiar o añadir un plan, para refrescar la lista del usuario. */
  onPlanCopiado: () => void
}

function AutorAvatar({ nombre, foto }: { nombre: string; foto: string | null }) {
  if (foto) {
    return <img src={foto} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }
  return (
    <div style={{
      width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>
      {nombre?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

export default function ExplorarFeed({ profile, pendientes, historias, onOpenPlan, onPlanCopiado }: Props) {
  const [planes, setPlanes] = useState<PlanExplorar[]>([])
  const [categoria, setCategoria] = useState<string>('Todos')
  const [loading, setLoading] = useState(true)
  const [copiando, setCopiando] = useState<string | null>(null)
  const [copiados, setCopiados] = useState<string[]>([])

  const cargar = useCallback(async () => {
    try {
      setPlanes(await getPlanesPublicos())
    } catch (e) {
      console.error('[explorar]', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const visibles = categoria === 'Todos'
    ? planes
    : planes.filter(p => p.categoria === categoria)

  const handleCopiar = async (plan: PlanExplorar) => {
    setCopiando(plan.id)
    const result = await copiarPlan(plan.id)
    setCopiando(null)
    if (!result.success) return
    setCopiados(prev => [...prev, plan.id])
    onPlanCopiado()
  }

  return (
    <div
      className="h-full overflow-y-auto"
      style={{
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
      } as React.CSSProperties}
    >
      {/* 1 — Ideas para ti (IA) */}
      <SugerenciasIA
        profile={profile}
        pendientes={pendientes}
        historias={historias}
        onPlanAnadido={onPlanCopiado}
      />

      {/* 2 — Cerca de ti (geolocalización; se oculta solo si no hay ubicación) */}
      <CercaDeTi onPlanAnadido={onPlanCopiado} />

      {/* 3 — Separador */}
      <div className="flex items-center gap-3 px-3 pt-5 pb-1">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#666666]">Descubre</p>
        <div className="flex-1 h-px bg-[#1A1A1A]" />
      </div>

      {/* 3 — Chips de categoría */}
      <div
        className="flex gap-2 overflow-x-auto px-3 py-3"
        style={{ scrollbarWidth: 'none' }}
      >
        {CATEGORIAS.map(cat => {
          const activo = cat === categoria
          return (
            <button
              key={cat}
              onClick={() => setCategoria(cat)}
              className="flex-shrink-0 rounded-full whitespace-nowrap transition-colors"
              style={{
                padding: '8px 16px',
                fontSize: 13,
                background: activo ? '#E8692A' : '#1A1A1A',
                color: activo ? '#FFFFFF' : '#666666',
                border: activo ? '1px solid #E8692A' : '1px solid #2A2A2A',
              }}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-[#2A2A2A] border-t-[#E8692A] rounded-full animate-spin" />
        </div>
      ) : visibles.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-8 py-16">
          <Compass style={{ width: 48, height: 48, color: '#2A2A2A' }} strokeWidth={1} />
          <p style={{ fontSize: 15, color: '#444444', textAlign: 'center' }}>
            {categoria === 'Todos' ? 'Aún no hay historias públicas.' : `Nada en ${categoria} todavía.`}
          </p>
          <p style={{ fontSize: 13, color: '#333333', textAlign: 'center' }}>
            Completa un plan y compártelo con el mundo.
          </p>
        </div>
      ) : (
        <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visibles.map(plan => {
            const yaCopiado = copiados.includes(plan.id)
            return (
              <div
                key={plan.id}
                onClick={() => onOpenPlan(plan)}
                style={{
                  position: 'relative', aspectRatio: '4/5',
                  borderRadius: 14, overflow: 'hidden', background: '#141414',
                  cursor: 'pointer',
                }}
                className="active:opacity-90 transition-opacity"
              >
                {plan.foto_url && (
                  <img
                    src={plan.foto_url}
                    alt=""
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}

                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to bottom, transparent 45%, rgba(0,0,0,0.85) 100%)',
                }} />

                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16 }}>
                  <p className="font-serif" style={{
                    fontSize: 19, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.25,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  } as React.CSSProperties}>
                    {plan.titulo}
                  </p>
                  <div className="flex items-center gap-2 mt-2.5">
                    <AutorAvatar nombre={plan.autor_nombre} foto={plan.autor_foto} />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
                      {plan.autor_username ? `@${plan.autor_username}` : plan.autor_nombre}
                    </span>
                  </div>
                </div>

                {/* Añadir a mi lista — no tiene sentido copiarte tu propio plan */}
                {!plan.es_mio && (
                  <button
                    onClick={e => { e.stopPropagation(); if (!yaCopiado) handleCopiar(plan) }}
                    disabled={copiando === plan.id || yaCopiado}
                    aria-label={yaCopiado ? 'Añadido a tus planes' : 'Añadir a mis planes'}
                    style={{
                      position: 'absolute', top: 12, right: 12,
                      width: 40, height: 40, borderRadius: '50%',
                      background: yaCopiado ? 'rgba(0,0,0,0.55)' : '#E8692A',
                      color: '#FFFFFF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
                    }}
                    className="active:scale-90 transition-transform disabled:opacity-70"
                  >
                    {copiando === plan.id
                      ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : yaCopiado
                        ? <Check style={{ width: 18, height: 18 }} strokeWidth={2.5} />
                        : <Plus style={{ width: 20, height: 20 }} strokeWidth={2.5} />
                    }
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
