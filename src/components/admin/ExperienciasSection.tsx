'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import type { Experiencia, ExperienciaGenerada } from '@/types/planes'

const ADMIN_HEADER = { 'Content-Type': 'application/json', 'X-Admin-Key': 'LivestoryAdmin2024' }

const CATEGORIAS = ['viajes', 'deporte', 'gastronomia', 'cultura', 'aventura', 'musica'] as const
const DIFICULTADES = ['facil', 'medio', 'dificil'] as const

const CAT_COLOR: Record<string, string> = {
  viajes: '#3B82F6',
  deporte: '#10B981',
  gastronomia: '#F59E0B',
  cultura: '#8B5CF6',
  aventura: '#E8692A',
  musica: '#EC4899',
}

const DIF_LABEL: Record<string, string> = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' }

// ── Reusable bits ────────────────────────────────────────────

function CategoriaBadge({ categoria }: { categoria: string }) {
  const color = CAT_COLOR[categoria] ?? '#666666'
  return (
    <span style={{
      fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em',
      color, background: `${color}22`, borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap',
    }}>
      {categoria}
    </span>
  )
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: '100%', maxWidth: 460, maxHeight: '88vh', overflowY: 'auto',
        background: '#141414', border: '1px solid #2A2A2A', borderRadius: 16, padding: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#E8692A', fontWeight: 700 }}>{title}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666666', cursor: 'pointer', padding: 4 }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 10,
  border: '1px solid #2A2A2A', background: '#1A1A1A', color: '#F0F0F0', fontSize: 14, outline: 'none',
}
const labelStyle: React.CSSProperties = {
  fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666666', marginBottom: 5, display: 'block',
}
const btnPrimary: React.CSSProperties = {
  padding: '12px 0', borderRadius: 10, background: '#E8692A', color: '#fff',
  fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', width: '100%',
}

// ── Manual create / edit modal ───────────────────────────────

type FormState = {
  titulo: string; categoria: string; ciudad: string; pais: string
  descripcion: string; dificultad: string; duracion: string; lugar_nombre: string; verificada: boolean
}

function ManualModal({
  editing, onClose, onSaved,
}: { editing: Experiencia | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<FormState>({
    titulo: editing?.titulo ?? '',
    categoria: editing?.categoria ?? 'aventura',
    ciudad: editing?.ciudad ?? '',
    pais: editing?.pais ?? 'España',
    descripcion: editing?.descripcion ?? '',
    dificultad: editing?.dificultad ?? 'facil',
    duracion: editing?.duracion ?? '',
    lugar_nombre: editing?.lugar_nombre ?? '',
    verificada: editing ? editing.verificada : true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    if (!form.titulo.trim()) { setError('El título es obligatorio'); return }
    setSaving(true)
    setError('')
    try {
      const method = editing ? 'PATCH' : 'POST'
      const payload = editing ? { id: editing.id, ...form } : form
      const res = await fetch('/api/admin/experiencias', {
        method, headers: ADMIN_HEADER, body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
      setError('No se pudo guardar')
      setSaving(false)
    }
  }

  return (
    <ModalShell title={editing ? 'Editar experiencia' : 'Añadir manual'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={labelStyle}>Título *</label>
          <input style={inputStyle} value={form.titulo} onChange={e => set('titulo', e.target.value)} autoFocus />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Categoría</label>
            <select style={inputStyle} value={form.categoria} onChange={e => set('categoria', e.target.value)}>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Dificultad</label>
            <select style={inputStyle} value={form.dificultad} onChange={e => set('dificultad', e.target.value)}>
              {DIFICULTADES.map(d => <option key={d} value={d}>{DIF_LABEL[d]}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Ciudad</label>
            <input style={inputStyle} value={form.ciudad} onChange={e => set('ciudad', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>País</label>
            <input style={inputStyle} value={form.pais} onChange={e => set('pais', e.target.value)} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Lugar</label>
          <input style={inputStyle} value={form.lugar_nombre} onChange={e => set('lugar_nombre', e.target.value)} />
        </div>

        <div>
          <label style={labelStyle}>Duración</label>
          <input style={inputStyle} value={form.duracion} onChange={e => set('duracion', e.target.value)} placeholder="2-3 horas" />
        </div>

        <div>
          <label style={labelStyle}>Descripción</label>
          <textarea
            style={{ ...inputStyle, resize: 'none' }} rows={3}
            value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#C0C0C0' }}>
          <input type="checkbox" checked={form.verificada} onChange={e => set('verificada', e.target.checked)} />
          Verificada
        </label>

        {error && <p style={{ fontSize: 13, color: '#C97B7B' }}>{error}</p>}

        <button style={{ ...btnPrimary, opacity: saving ? 0.5 : 1 }} disabled={saving} onClick={guardar}>
          {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear experiencia'}
        </button>
      </div>
    </ModalShell>
  )
}

// ── AI generation modal ──────────────────────────────────────

function GenerarModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [categoria, setCategoria] = useState<string>('aventura')
  const [tipo, setTipo] = useState('')
  const [zona, setZona] = useState('')
  const [cantidad, setCantidad] = useState(10)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [generadas, setGeneradas] = useState<ExperienciaGenerada[]>([])
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set())

  const generar = async () => {
    if (!tipo.trim() || !zona.trim()) { setError('Rellena tipo y zona'); return }
    setLoading(true)
    setError('')
    setGeneradas([])
    try {
      const res = await fetch('/api/admin/generar-experiencias', {
        method: 'POST', headers: ADMIN_HEADER,
        body: JSON.stringify({ categoria, tipo, zona, cantidad }),
      })
      const json = await res.json()
      if (!res.ok || !json.experiencias?.length) throw new Error(json.error ?? 'Sin resultados')
      setGeneradas(json.experiencias as ExperienciaGenerada[])
      setSeleccion(new Set(json.experiencias.map((_: unknown, i: number) => i)))
    } catch (err) {
      console.error(err)
      setError('No se pudieron generar. Inténtalo otra vez.')
    } finally {
      setLoading(false)
    }
  }

  const toggle = (i: number) => setSeleccion(prev => {
    const next = new Set(prev)
    next.has(i) ? next.delete(i) : next.add(i)
    return next
  })

  const guardar = async () => {
    const elegidas = generadas.filter((_, i) => seleccion.has(i))
    if (elegidas.length === 0) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/experiencias', {
        method: 'POST', headers: ADMIN_HEADER,
        // Las generadas por IA entran sin verificar; se revisan luego.
        body: JSON.stringify({ experiencias: elegidas, verificada: false }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
      setError('No se pudieron guardar')
      setSaving(false)
    }
  }

  return (
    <ModalShell title="Generar con IA" onClose={onClose}>
      {generadas.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Categoría</label>
            <select style={inputStyle} value={categoria} onChange={e => setCategoria(e.target.value)}>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Tipo de experiencia</label>
            <input style={inputStyle} value={tipo} onChange={e => setTipo(e.target.value)} placeholder="Karting, Restaurantes Thai, Vías ferratas" />
          </div>
          <div>
            <label style={labelStyle}>Zona geográfica</label>
            <input style={inputStyle} value={zona} onChange={e => setZona(e.target.value)} placeholder="España, Barcelona, Europa" />
          </div>
          <div>
            <label style={labelStyle}>Cantidad</label>
            <select style={inputStyle} value={cantidad} onChange={e => setCantidad(Number(e.target.value))}>
              {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {error && <p style={{ fontSize: 13, color: '#C97B7B' }}>{error}</p>}

          <button style={{ ...btnPrimary, opacity: loading ? 0.5 : 1 }} disabled={loading} onClick={generar}>
            {loading ? `Generando ${cantidad} experiencias...` : 'Generar'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 12, color: '#888888' }}>
            {seleccion.size} de {generadas.length} seleccionadas
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '48vh', overflowY: 'auto' }}>
            {generadas.map((exp, i) => {
              const sel = seleccion.has(i)
              return (
                <button
                  key={i}
                  onClick={() => toggle(i)}
                  style={{
                    textAlign: 'left', display: 'flex', gap: 10, alignItems: 'flex-start',
                    background: sel ? 'rgba(232,105,42,0.08)' : '#1A1A1A',
                    border: `1px solid ${sel ? '#E8692A' : '#2A2A2A'}`,
                    borderRadius: 10, padding: 12, cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
                    background: sel ? '#E8692A' : 'transparent', border: `1.5px solid ${sel ? '#E8692A' : '#444444'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {sel && <Check style={{ width: 13, height: 13, color: '#fff' }} strokeWidth={3} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, color: '#F0F0F0', fontWeight: 500 }}>{exp.titulo}</p>
                    <p style={{ fontSize: 12, color: '#888888', marginTop: 2 }}>
                      {[exp.ciudad, exp.pais].filter(Boolean).join(', ')}
                      {exp.duracion ? ` · ${exp.duracion}` : ''}
                    </p>
                    {exp.descripcion && (
                      <p style={{ fontSize: 12, color: '#666666', marginTop: 4, lineHeight: 1.4 }}>{exp.descripcion}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {error && <p style={{ fontSize: 13, color: '#C97B7B' }}>{error}</p>}

          <button
            style={{ ...btnPrimary, opacity: saving || seleccion.size === 0 ? 0.5 : 1 }}
            disabled={saving || seleccion.size === 0}
            onClick={guardar}
          >
            {saving ? 'Guardando...' : `Guardar ${seleccion.size} seleccionadas`}
          </button>
        </div>
      )}
    </ModalShell>
  )
}

// ── Section ──────────────────────────────────────────────────

export default function ExperienciasSection() {
  const [experiencias, setExperiencias] = useState<Experiencia[]>([])
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [verificadas, setVerificadas] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [showGenerar, setShowGenerar] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [editing, setEditing] = useState<Experiencia | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const cargar = useCallback(async (p: number) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/experiencias?page=${p}`, { headers: ADMIN_HEADER })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setExperiencias(json.experiencias)
      setTotal(json.total)
      setVerificadas(json.verificadas)
      setPage(json.page)
    } catch (err) {
      console.error(err)
      setError('No se pudieron cargar las experiencias.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar(0) }, [cargar])

  const toggleVerificada = async (exp: Experiencia) => {
    const next = !exp.verificada
    // Optimista.
    setExperiencias(prev => prev.map(e => e.id === exp.id ? { ...e, verificada: next } : e))
    setVerificadas(v => v + (next ? 1 : -1))
    const res = await fetch('/api/admin/experiencias', {
      method: 'PATCH', headers: ADMIN_HEADER, body: JSON.stringify({ id: exp.id, verificada: next }),
    })
    if (!res.ok) cargar(page) // revertir recargando
  }

  const borrar = async (id: string) => {
    setConfirmDelete(null)
    const res = await fetch(`/api/admin/experiencias?id=${id}`, { method: 'DELETE', headers: ADMIN_HEADER })
    if (res.ok) cargar(page)
  }

  const totalPages = Math.max(1, Math.ceil(total / 20))
  const pendientes = total - verificadas

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#E8692A', fontWeight: 700, marginBottom: 6 }}>
            Biblioteca de experiencias
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Stat label={total === 1 ? 'experiencia' : 'experiencias'} value={total} />
            <Stat label="verificadas" value={verificadas} color="#10B981" />
            <Stat label="pendientes" value={pendientes} color="#F59E0B" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowGenerar(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: 10, background: '#E8692A', color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            <Sparkles style={{ width: 13, height: 13 }} /> Generar con IA
          </button>
          <button
            onClick={() => { setEditing(null); setShowManual(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: 10, background: '#1A1A1A', color: '#F0F0F0', fontSize: 12, fontWeight: 600, border: '1px solid #2A2A2A', cursor: 'pointer' }}
          >
            <Plus style={{ width: 13, height: 13 }} /> Añadir manual
          </button>
        </div>
      </div>

      {error && <p style={{ fontSize: 13, color: '#C97B7B', marginBottom: 12 }}>{error}</p>}

      {/* Table */}
      <div style={{ overflowX: 'auto', marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
        <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Título', 'Categoría', 'Ciudad / País', 'Dificultad', 'Verificada', 'Añadida', 'Acciones'].map(h => (
                <th key={h} style={{ textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#E8692A', fontWeight: 600, paddingBottom: 8, paddingRight: 14, whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {experiencias.length === 0 && !loading ? (
              <tr><td colSpan={7} style={{ padding: '24px 0', color: '#444444', textAlign: 'center' }}>Aún no hay experiencias.</td></tr>
            ) : experiencias.map((exp, i) => (
              <tr key={exp.id} style={{ background: i % 2 === 0 ? '#0A0A0A' : '#141414' }}>
                <td style={{ padding: '10px 14px 10px 0', color: '#F0F0F0', maxWidth: 240 }}>{exp.titulo}</td>
                <td style={{ padding: '10px 14px 10px 0' }}><CategoriaBadge categoria={exp.categoria} /></td>
                <td style={{ padding: '10px 14px 10px 0', color: '#666666', whiteSpace: 'nowrap' }}>
                  {[exp.ciudad, exp.pais].filter(Boolean).join(' / ') || '—'}
                </td>
                <td style={{ padding: '10px 14px 10px 0', color: '#C0C0C0', whiteSpace: 'nowrap' }}>
                  {exp.dificultad ? (DIF_LABEL[exp.dificultad] ?? exp.dificultad) : '—'}
                </td>
                <td style={{ padding: '10px 14px 10px 0' }}>
                  <button
                    onClick={() => toggleVerificada(exp)}
                    role="switch"
                    aria-checked={exp.verificada}
                    style={{
                      position: 'relative', width: 38, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                      background: exp.verificada ? '#10B981' : '#2A2A2A', transition: 'background 0.15s', flexShrink: 0,
                    }}
                  >
                    <span style={{ position: 'absolute', top: 3, left: exp.verificada ? 19 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
                  </button>
                </td>
                <td style={{ padding: '10px 14px 10px 0', color: '#F0F0F0', textAlign: 'center' }}>{exp.veces_anadida}</td>
                <td style={{ padding: '10px 0' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => { setEditing(exp); setShowManual(true) }}
                      aria-label="Editar"
                      style={{ padding: 6, borderRadius: 7, background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#888888', cursor: 'pointer' }}
                    >
                      <Pencil style={{ width: 13, height: 13 }} />
                    </button>
                    {confirmDelete === exp.id ? (
                      <button
                        onClick={() => borrar(exp.id)}
                        style={{ padding: '6px 10px', borderRadius: 7, background: '#8B3A3A', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Confirmar
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(exp.id)}
                        aria-label="Borrar"
                        style={{ padding: 6, borderRadius: 7, background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#C97B7B', cursor: 'pointer' }}
                      >
                        <Trash2 style={{ width: 13, height: 13 }} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16 }}>
          <button
            onClick={() => cargar(page - 1)}
            disabled={page === 0 || loading}
            style={{ padding: '8px 14px', borderRadius: 8, background: '#1A1A1A', border: '1px solid #2A2A2A', color: page === 0 ? '#444444' : '#F0F0F0', fontSize: 13, cursor: page === 0 ? 'default' : 'pointer' }}
          >
            Anterior
          </button>
          <span style={{ fontSize: 12, color: '#666666' }}>{page + 1} / {totalPages}</span>
          <button
            onClick={() => cargar(page + 1)}
            disabled={page + 1 >= totalPages || loading}
            style={{ padding: '8px 14px', borderRadius: 8, background: '#1A1A1A', border: '1px solid #2A2A2A', color: page + 1 >= totalPages ? '#444444' : '#F0F0F0', fontSize: 13, cursor: page + 1 >= totalPages ? 'default' : 'pointer' }}
          >
            Siguiente
          </button>
        </div>
      )}

      {showGenerar && <GenerarModal onClose={() => setShowGenerar(false)} onSaved={() => cargar(0)} />}
      {showManual && (
        <ManualModal
          editing={editing}
          onClose={() => { setShowManual(false); setEditing(null) }}
          onSaved={() => cargar(page)}
        />
      )}
    </div>
  )
}

function Stat({ label, value, color = '#E8692A' }: { label: string; value: number; color?: string }) {
  return (
    <span style={{ fontSize: 12, color: '#888888' }}>
      <span style={{ color, fontWeight: 700 }}>{value}</span> {label}
    </span>
  )
}
