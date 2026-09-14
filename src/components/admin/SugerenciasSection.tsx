'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Check, X } from 'lucide-react'
import {
  CATEGORIAS, CATEGORIA_LABEL, CATEGORIA_COLOR, PUNTOS_MIN, type CategoriaGooal,
} from '@/lib/gooals'
import type { GooalSugerencia, EstadoSugerencia } from '@/types/gooals'
import SelectorPuntos from './SelectorPuntos'

const PESTANAS: { estado: EstadoSugerencia; label: string }[] = [
  { estado: 'pendiente', label: 'Pendientes' },
  { estado: 'aprobada', label: 'Aprobadas' },
  { estado: 'rechazada', label: 'Rechazadas' },
]

export default function SugerenciasSection() {
  const [estado, setEstado] = useState<EstadoSugerencia>('pendiente')
  const [sugerencias, setSugerencias] = useState<GooalSugerencia[]>([])
  const [pendientes, setPendientes] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [trabajando, setTrabajando] = useState<string | null>(null)

  // Ediciones del admin antes de aprobar, por id de sugerencia.
  const [ediciones, setEdiciones] = useState<Record<string, {
    titulo: string; categoria: CategoriaGooal; puntos: number
  }>>({})

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await fetch(`/api/admin/sugerencias?estado=${estado}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error')
      setSugerencias(json.sugerencias)
      setPendientes(json.pendientes)
      setEdiciones(Object.fromEntries(
        (json.sugerencias as GooalSugerencia[]).map(s => [
          s.id, { titulo: s.titulo, categoria: s.categoria, puntos: PUNTOS_MIN },
        ]),
      ))
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No he podido cargar las sugerencias')
    } finally {
      setCargando(false)
    }
  }, [estado])

  useEffect(() => { cargar() }, [cargar])

  const revisar = async (id: string, accion: 'aprobar' | 'rechazar') => {
    setTrabajando(id)
    setError('')
    try {
      const edicion = ediciones[id]
      const res = await fetch('/api/admin/sugerencias', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          accion === 'aprobar' ? { id, accion, ...edicion } : { id, accion },
        ),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error')
      setSugerencias(previas => previas.filter(s => s.id !== id))
      setPendientes(p => Math.max(0, p - 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No he podido revisar la sugerencia')
    } finally {
      setTrabajando(null)
    }
  }

  const editar = (id: string, cambio: Partial<{
    titulo: string; categoria: CategoriaGooal; puntos: number
  }>) => {
    setEdiciones(prev => ({ ...prev, [id]: { ...prev[id], ...cambio } }))
  }

  return (
    <>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#7A8A85' }}>
          Sugerencias de la comunidad
          {pendientes > 0 && (
            <span
              style={{
                marginLeft: 8, padding: '2px 7px', borderRadius: 999, fontSize: 10,
                color: '#0B0B0B', background: '#00D1A7', letterSpacing: 0,
              }}
            >
              {pendientes}
            </span>
          )}
        </p>
        <button
          onClick={cargar}
          aria-label="Recargar"
          style={{ padding: 6, color: '#7A8A85' }}
        >
          <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex gap-2" style={{ marginBottom: 14 }}>
        {PESTANAS.map(p => (
          <button
            key={p.estado}
            onClick={() => setEstado(p.estado)}
            style={{
              padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 500,
              border: `1px solid ${estado === p.estado ? '#00D1A7' : '#2A2E2C'}`,
              background: estado === p.estado ? 'rgba(0,209,167,0.12)' : 'transparent',
              color: estado === p.estado ? '#00D1A7' : '#A3B1AC',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-[#FF5252] bg-[rgba(255,82,82,0.14)] rounded-lg" style={{ padding: '9px 12px', marginBottom: 12 }}>
          {error}
        </p>
      )}

      {cargando ? (
        <p style={{ fontSize: 13, color: '#7A8A85' }}>Cargando...</p>
      ) : sugerencias.length === 0 ? (
        <p style={{ fontSize: 13, color: '#7A8A85' }}>
          {estado === 'pendiente' ? 'No hay nada pendiente de revisar.' : 'Nada por aquí.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sugerencias.map(s => {
            const edicion = ediciones[s.id]
            const ocupado = trabajando === s.id
            return (
              <div
                key={s.id}
                style={{
                  background: '#1E2120', border: '1px solid #2A2E2C',
                  borderRadius: 12, padding: 14,
                }}
              >
                {estado === 'pendiente' ? (
                  <>
                    <input
                      value={edicion?.titulo ?? s.titulo}
                      onChange={e => editar(s.id, { titulo: e.target.value })}
                      className="w-full rounded-lg border border-[#2A2E2C] bg-[#0B0B0B] text-[#FFFFFF] focus:outline-none focus:border-[#00D1A7]"
                      style={{ padding: '9px 11px', fontSize: 14 }}
                    />

                    <div className="flex flex-wrap gap-1.5" style={{ marginTop: 10 }}>
                      {CATEGORIAS.map(c => (
                        <button
                          key={c}
                          onClick={() => editar(s.id, { categoria: c })}
                          style={{
                            padding: '5px 10px', borderRadius: 999, fontSize: 11,
                            border: `1px solid ${edicion?.categoria === c ? CATEGORIA_COLOR[c] : '#2A2E2C'}`,
                            background: edicion?.categoria === c ? `${CATEGORIA_COLOR[c]}22` : 'transparent',
                            color: edicion?.categoria === c ? CATEGORIA_COLOR[c] : '#7A8A85',
                          }}
                        >
                          {CATEGORIA_LABEL[c]}
                        </button>
                      ))}
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <SelectorPuntos
                        compacto
                        valor={edicion?.puntos ?? PUNTOS_MIN}
                        onCambiar={puntos => editar(s.id, { puntos })}
                      />
                    </div>

                    <div className="flex gap-2" style={{ marginTop: 12 }}>
                      <button
                        onClick={() => revisar(s.id, 'aprobar')}
                        disabled={ocupado}
                        className="flex items-center justify-center gap-1.5 flex-1 rounded-lg active:opacity-80"
                        style={{
                          padding: '10px', fontSize: 13, fontWeight: 600,
                          color: '#0B0B0B', background: ocupado ? '#2A2E2C' : '#00D1A7',
                        }}
                      >
                        <Check className="w-4 h-4" strokeWidth={2.5} /> Publicar
                      </button>
                      <button
                        onClick={() => revisar(s.id, 'rechazar')}
                        disabled={ocupado}
                        className="flex items-center justify-center gap-1.5 rounded-lg active:opacity-80"
                        style={{
                          padding: '10px 16px', fontSize: 13, fontWeight: 500,
                          color: '#FF5252', border: '1px solid #2A2E2C',
                        }}
                      >
                        <X className="w-4 h-4" /> Descartar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 14, color: '#FFFFFF' }}>{s.titulo}</p>
                    <p style={{ fontSize: 11, color: '#7A8A85', marginTop: 5 }}>
                      {CATEGORIA_LABEL[s.categoria]}
                      {s.revisada_at && ` · revisada ${new Date(s.revisada_at).toLocaleDateString('es-ES')}`}
                    </p>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
