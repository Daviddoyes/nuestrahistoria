'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { Plus, MapPin, ChevronDown, ChevronRight, X } from 'lucide-react'
import type { Gooal, GooalLugar } from '@/types/planes'

const ADMIN_HEADER = { 'Content-Type': 'application/json', 'X-Admin-Key': 'LivestoryAdmin2024' }
const CATEGORIAS = ['viajes', 'deporte', 'gastronomia', 'cultura', 'aventura', 'musica'] as const
const DIFICULTADES = ['facil', 'medio', 'dificil'] as const

const CAT_COLOR: Record<string, string> = {
  viajes: '#3B82F6', deporte: '#10B981', gastronomia: '#F59E0B',
  cultura: '#8B5CF6', aventura: '#E8692A', musica: '#EC4899',
}

type GooalRow = Gooal & { num_lugares: number }

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

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: '100%', maxWidth: 440, maxHeight: '88vh', overflowY: 'auto', background: '#141414', border: '1px solid #2A2A2A', borderRadius: 16, padding: 20 }}>
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

// ── Nuevo gooal ──────────────────────────────────────────────
function NuevoGooalModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ titulo: '', categoria: 'aventura', subcategoria: '', descripcion: '', dificultad: 'facil', duracion: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const guardar = async () => {
    if (!f.titulo.trim()) { setError('El título es obligatorio'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/admin/gooals', { method: 'POST', headers: ADMIN_HEADER, body: JSON.stringify(f) })
    if (res.ok) { onSaved(); onClose(); return }
    const j = await res.json().catch(() => ({}))
    setError(j.error ?? 'No se pudo guardar')
    setSaving(false)
  }

  return (
    <ModalShell title="Nuevo gooal" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div><label style={labelStyle}>Título *</label><input style={inputStyle} value={f.titulo} onChange={e => setF({ ...f, titulo: e.target.value })} autoFocus placeholder="Practicar Karting" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>Categoría</label>
            <select style={inputStyle} value={f.categoria} onChange={e => setF({ ...f, categoria: e.target.value })}>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Dificultad</label>
            <select style={inputStyle} value={f.dificultad} onChange={e => setF({ ...f, dificultad: e.target.value })}>
              {DIFICULTADES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div><label style={labelStyle}>Subcategoría</label><input style={inputStyle} value={f.subcategoria} onChange={e => setF({ ...f, subcategoria: e.target.value })} placeholder="karting" /></div>
        <div><label style={labelStyle}>Duración</label><input style={inputStyle} value={f.duracion} onChange={e => setF({ ...f, duracion: e.target.value })} placeholder="2-3 horas" /></div>
        <div><label style={labelStyle}>Descripción</label><textarea style={{ ...inputStyle, resize: 'none' }} rows={3} value={f.descripcion} onChange={e => setF({ ...f, descripcion: e.target.value })} /></div>
        {error && <p style={{ fontSize: 13, color: '#C97B7B' }}>{error}</p>}
        <button style={{ ...btnPrimary, opacity: saving ? 0.5 : 1 }} disabled={saving} onClick={guardar}>{saving ? 'Guardando...' : 'Crear gooal'}</button>
      </div>
    </ModalShell>
  )
}

// ── Añadir lugar ─────────────────────────────────────────────
function NuevoLugarModal({ gooal, onClose, onSaved }: { gooal: GooalRow; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ nombre_lugar: '', ciudad: '', pais: 'España', latitud: '', longitud: '', direccion: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const guardar = async () => {
    if (!f.nombre_lugar.trim()) { setError('El nombre del lugar es obligatorio'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/admin/gooals', {
      method: 'POST', headers: ADMIN_HEADER,
      body: JSON.stringify({ tipo: 'lugar', gooal_id: gooal.id, ...f }),
    })
    if (res.ok) { onSaved(); onClose(); return }
    const j = await res.json().catch(() => ({}))
    setError(j.error ?? 'No se pudo guardar')
    setSaving(false)
  }

  return (
    <ModalShell title={`Añadir lugar · ${gooal.titulo}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div><label style={labelStyle}>Nombre del lugar *</label><input style={inputStyle} value={f.nombre_lugar} onChange={e => setF({ ...f, nombre_lugar: e.target.value })} autoFocus /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>Ciudad</label><input style={inputStyle} value={f.ciudad} onChange={e => setF({ ...f, ciudad: e.target.value })} /></div>
          <div><label style={labelStyle}>País</label><input style={inputStyle} value={f.pais} onChange={e => setF({ ...f, pais: e.target.value })} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>Latitud</label><input style={inputStyle} value={f.latitud} onChange={e => setF({ ...f, latitud: e.target.value })} inputMode="decimal" placeholder="40.4168" /></div>
          <div><label style={labelStyle}>Longitud</label><input style={inputStyle} value={f.longitud} onChange={e => setF({ ...f, longitud: e.target.value })} inputMode="decimal" placeholder="-3.7038" /></div>
        </div>
        <div><label style={labelStyle}>Dirección</label><input style={inputStyle} value={f.direccion} onChange={e => setF({ ...f, direccion: e.target.value })} /></div>
        {error && <p style={{ fontSize: 13, color: '#C97B7B' }}>{error}</p>}
        <button style={{ ...btnPrimary, opacity: saving ? 0.5 : 1 }} disabled={saving} onClick={guardar}>{saving ? 'Guardando...' : 'Añadir lugar'}</button>
      </div>
    </ModalShell>
  )
}

// ── Section ──────────────────────────────────────────────────
export default function GooalsSection() {
  const [gooals, setGooals] = useState<GooalRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [lugares, setLugares] = useState<Record<string, GooalLugar[]>>({})
  const [showNuevo, setShowNuevo] = useState(false)
  const [lugarPara, setLugarPara] = useState<GooalRow | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/gooals', { headers: ADMIN_HEADER })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setGooals(json.gooals)
    } catch (err) {
      console.error(err)
      setError('No se pudieron cargar los gooals.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const toggleLugares = async (id: string) => {
    if (expandido === id) { setExpandido(null); return }
    setExpandido(id)
    if (!lugares[id]) {
      const res = await fetch(`/api/admin/gooals?gooal_id=${id}`, { headers: ADMIN_HEADER })
      if (res.ok) {
        const json = await res.json()
        setLugares(prev => ({ ...prev, [id]: json.lugares }))
      }
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#E8692A', fontWeight: 700, marginBottom: 6 }}>
            Gooals
          </p>
          <span style={{ fontSize: 12, color: '#888888' }}>
            <span style={{ color: '#E8692A', fontWeight: 700 }}>{gooals.length}</span> {gooals.length === 1 ? 'gooal' : 'gooals'}
          </span>
        </div>
        <button
          onClick={() => setShowNuevo(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: 10, background: '#E8692A', color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}
        >
          <Plus style={{ width: 13, height: 13 }} /> Nuevo gooal
        </button>
      </div>

      {error && <p style={{ fontSize: 13, color: '#C97B7B', marginBottom: 12 }}>{error}</p>}

      <div style={{ overflowX: 'auto', marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
        <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['', 'Título', 'Categoría', 'Lugares', 'Añadido', ''].map((h, i) => (
                <th key={i} style={{ textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#E8692A', fontWeight: 600, paddingBottom: 8, paddingRight: 14, whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gooals.length === 0 && !loading ? (
              <tr><td colSpan={6} style={{ padding: '24px 0', color: '#444444', textAlign: 'center' }}>Aún no hay gooals. Ejecuta la Fase 4 del script o crea uno.</td></tr>
            ) : gooals.map((g, i) => {
              const color = CAT_COLOR[g.categoria] ?? '#666666'
              const abierto = expandido === g.id
              return (
                <Fragment key={g.id}>
                  <tr style={{ background: i % 2 === 0 ? '#0A0A0A' : '#141414' }}>
                    <td style={{ padding: '10px 8px 10px 0' }}>
                      <button
                        onClick={() => toggleLugares(g.id)}
                        aria-label="Ver lugares"
                        style={{ background: 'none', border: 'none', color: '#888888', cursor: 'pointer', display: 'flex' }}
                      >
                        {abierto ? <ChevronDown style={{ width: 15, height: 15 }} /> : <ChevronRight style={{ width: 15, height: 15 }} />}
                      </button>
                    </td>
                    <td style={{ padding: '10px 14px 10px 0', color: '#F0F0F0', maxWidth: 260 }}>{g.titulo}</td>
                    <td style={{ padding: '10px 14px 10px 0' }}>
                      <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color, background: `${color}22`, borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap' }}>
                        {g.categoria}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px 10px 0', color: '#F0F0F0', textAlign: 'center' }}>{g.num_lugares}</td>
                    <td style={{ padding: '10px 14px 10px 0', color: '#F0F0F0', textAlign: 'center' }}>{g.veces_añadido}</td>
                    <td style={{ padding: '10px 0' }}>
                      <button
                        onClick={() => setLugarPara(g)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 7, background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#888888', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        <MapPin style={{ width: 12, height: 12 }} /> Añadir lugar
                      </button>
                    </td>
                  </tr>
                  {abierto && (
                    <tr style={{ background: '#0D0D0D' }}>
                      <td colSpan={6} style={{ padding: '4px 0 12px 24px' }}>
                        {!lugares[g.id] ? (
                          <p style={{ fontSize: 12, color: '#666666' }}>Cargando lugares...</p>
                        ) : lugares[g.id].length === 0 ? (
                          <p style={{ fontSize: 12, color: '#444444' }}>Sin lugares.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {lugares[g.id].map(l => (
                              <div key={l.id} style={{ fontSize: 12, color: '#C0C0C0', display: 'flex', gap: 8 }}>
                                <MapPin style={{ width: 12, height: 12, color: '#E8692A', flexShrink: 0, marginTop: 2 }} />
                                <span>
                                  <span style={{ color: '#F0F0F0' }}>{l.nombre_lugar}</span>
                                  {' · '}{[l.ciudad, l.pais].filter(Boolean).join(', ')}
                                  {l.latitud != null && l.longitud != null && (
                                    <span style={{ color: '#555555' }}>{` · ${Number(l.latitud).toFixed(3)}, ${Number(l.longitud).toFixed(3)}`}</span>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {showNuevo && <NuevoGooalModal onClose={() => setShowNuevo(false)} onSaved={cargar} />}
      {lugarPara && (
        <NuevoLugarModal
          gooal={lugarPara}
          onClose={() => setLugarPara(null)}
          onSaved={() => { setLugares(prev => { const n = { ...prev }; delete n[lugarPara.id]; return n }); cargar() }}
        />
      )}
    </div>
  )
}
