'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Sparkles } from 'lucide-react'
import { ADMIN_KEY } from '@/lib/admin-auth'
import {
  CATEGORIAS, CATEGORIA_LABEL, CATEGORIA_COLOR, DIFICULTADES, DIFICULTAD_META,
  puntosPorDificultad, type CategoriaGooal, type DificultadGooal,
} from '@/lib/gooals'
import type { GooalV2 } from '@/types/gooals'

const HEADERS = { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY }

type GooalGenerado = {
  titulo: string
  descripcion: string
  categoria: string
  dificultad: string
  ciudad: string
  pais: string
  puntos: number
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 10,
  border: '1px solid #2A2A2A', background: '#1A1A1A', color: '#F0F0F0', fontSize: 14, outline: 'none',
}
const labelStyle: React.CSSProperties = {
  fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666666',
  marginBottom: 5, display: 'block',
}
const btnPrimary: React.CSSProperties = {
  padding: '12px 0', borderRadius: 10, background: '#1DE9B6', color: '#0A0A0A',
  fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', width: '100%',
}

function ModalShell({
  title, onClose, children,
}: { title: string; onClose: () => void; children: React.ReactNode }) {
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
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#1DE9B6', fontWeight: 700 }}>
            {title}
          </p>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: '#666666', cursor: 'pointer', padding: 4 }}>
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
  const [f, setF] = useState({
    titulo: '', descripcion: '', categoria: 'aventura' as CategoriaGooal,
    dificultad: 'facil' as DificultadGooal, ciudad: '', pais: 'España',
    imagen_url: '', activo: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const guardar = async () => {
    if (!f.titulo.trim()) { setError('El título es obligatorio'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/admin/gooals-v2', { method: 'POST', headers: HEADERS, body: JSON.stringify(f) })
      if (res.ok) { onSaved(); onClose(); return }
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'No se pudo guardar')
    } catch (err) {
      console.error('[NuevoGooalModal]', err)
      setError('No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title="Nuevo gooal" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={labelStyle}>Título *</label>
          <input style={inputStyle} value={f.titulo} autoFocus placeholder="Dormir bajo las estrellas"
            onChange={e => setF({ ...f, titulo: e.target.value })} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Categoría</label>
            <select style={inputStyle} value={f.categoria}
              onChange={e => setF({ ...f, categoria: e.target.value as CategoriaGooal })}>
              {CATEGORIAS.map(c => <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Dificultad</label>
            <select style={inputStyle} value={f.dificultad}
              onChange={e => setF({ ...f, dificultad: e.target.value as DificultadGooal })}>
              {DIFICULTADES.map(d => (
                <option key={d} value={d}>
                  {DIFICULTAD_META[d].emoji} {DIFICULTAD_META[d].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#666666', marginTop: -4 }}>
          Puntos asignados automáticamente:{' '}
          <span style={{ color: '#1DE9B6', fontWeight: 700 }}>+{puntosPorDificultad(f.dificultad)} pts</span>
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Ciudad</label>
            <input style={inputStyle} value={f.ciudad} onChange={e => setF({ ...f, ciudad: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>País</label>
            <input style={inputStyle} value={f.pais} onChange={e => setF({ ...f, pais: e.target.value })} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Imagen (URL)</label>
          <input style={inputStyle} value={f.imagen_url} placeholder="https://..."
            onChange={e => setF({ ...f, imagen_url: e.target.value })} />
        </div>

        <div>
          <label style={labelStyle}>Descripción</label>
          <textarea style={{ ...inputStyle, resize: 'none' }} rows={3} value={f.descripcion}
            onChange={e => setF({ ...f, descripcion: e.target.value })} />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#C0C0C0', cursor: 'pointer' }}>
          <input type="checkbox" checked={f.activo} onChange={e => setF({ ...f, activo: e.target.checked })} />
          Activo (visible en Explorar)
        </label>

        {error && <p style={{ fontSize: 13, color: '#C97B7B' }}>{error}</p>}
        <button style={{ ...btnPrimary, opacity: saving ? 0.5 : 1 }} disabled={saving} onClick={guardar}>
          {saving ? 'Guardando...' : 'Crear gooal'}
        </button>
      </div>
    </ModalShell>
  )
}

// ── Generar con IA ───────────────────────────────────────────
function GenerarIAModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [categoria, setCategoria] = useState<CategoriaGooal>('aventura')
  const [zona, setZona] = useState('España')
  const [generando, setGenerando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [generados, setGenerados] = useState<GooalGenerado[] | null>(null)
  const [error, setError] = useState('')

  const generar = async () => {
    setGenerando(true); setError(''); setGenerados(null)
    try {
      const res = await fetch('/api/admin/generar-gooals', {
        method: 'POST', headers: HEADERS, body: JSON.stringify({ categoria, zona }),
      })
      const j = await res.json()
      if (!res.ok || !j.gooals?.length) throw new Error(j.error ?? 'No se generó nada')
      setGenerados(j.gooals)
    } catch (err) {
      console.error('[GenerarIAModal]', err)
      setError(err instanceof Error ? err.message : 'No se pudo generar')
    } finally {
      setGenerando(false)
    }
  }

  const guardarTodos = async () => {
    if (!generados) return
    setGuardando(true); setError('')
    try {
      const res = await fetch('/api/admin/gooals-v2', {
        method: 'POST', headers: HEADERS, body: JSON.stringify({ gooals: generados }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'No se pudieron guardar')
      }
      onSaved(); onClose()
    } catch (err) {
      console.error('[GenerarIAModal]', err)
      setError(err instanceof Error ? err.message : 'No se pudieron guardar')
      setGuardando(false)
    }
  }

  return (
    <ModalShell title="Generar 20 gooals con IA" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Categoría</label>
            <select style={inputStyle} value={categoria}
              onChange={e => setCategoria(e.target.value as CategoriaGooal)}>
              {CATEGORIAS.map(c => <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Zona</label>
            <input style={inputStyle} value={zona} onChange={e => setZona(e.target.value)} placeholder="España" />
          </div>
        </div>

        <button
          onClick={generar}
          disabled={generando || guardando}
          style={{
            ...btnPrimary, background: 'transparent', color: '#1DE9B6',
            border: '1px solid #1DE9B6', opacity: generando ? 0.5 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {generando
            ? <span style={{ width: 14, height: 14, border: '2px solid #1DE9B6', borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin" />
            : <Sparkles style={{ width: 14, height: 14 }} />
          }
          {generando ? 'Generando...' : generados ? 'Volver a generar' : 'Generar'}
        </button>

        {error && <p style={{ fontSize: 13, color: '#C97B7B' }}>{error}</p>}

        {generados && (
          <>
            <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {generados.map((g, i) => {
                const meta = DIFICULTAD_META[g.dificultad as DificultadGooal]
                return (
                  <div key={i} style={{ background: '#1A1A1A', borderRadius: 8, padding: '8px 10px' }}>
                    <p style={{ fontSize: 13, color: '#F0F0F0' }}>{g.titulo}</p>
                    <p style={{ fontSize: 11, color: '#666666', marginTop: 2 }}>
                      {meta?.emoji} {meta?.label} · <span style={{ color: '#1DE9B6' }}>+{g.puntos} pts</span>
                      {g.ciudad ? ` · ${g.ciudad}` : ''}
                    </p>
                  </div>
                )
              })}
            </div>

            <button
              style={{ ...btnPrimary, opacity: guardando ? 0.5 : 1 }}
              disabled={guardando}
              onClick={guardarTodos}
            >
              {guardando ? 'Guardando...' : `Guardar los ${generados.length} gooals`}
            </button>
          </>
        )}
      </div>
    </ModalShell>
  )
}

// ── Sección ──────────────────────────────────────────────────
export default function GooalsV2Section() {
  const [gooals, setGooals] = useState<GooalV2[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showNuevo, setShowNuevo] = useState(false)
  const [showIA, setShowIA] = useState(false)
  const [cambiando, setCambiando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/gooals-v2', { headers: HEADERS })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setGooals(json.gooals)
    } catch (err) {
      console.error('[GooalsV2Section]', err)
      setError('No se pudo cargar el catálogo. ¿Has ejecutado supabase/fase3.sql?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const toggleActivo = async (g: GooalV2) => {
    setCambiando(g.id)
    // Optimista: si el PATCH falla, cargar() devuelve el valor real.
    setGooals(prev => prev.map(x => x.id === g.id ? { ...x, activo: !x.activo } : x))
    try {
      const res = await fetch('/api/admin/gooals-v2', {
        method: 'PATCH', headers: HEADERS,
        body: JSON.stringify({ id: g.id, activo: !g.activo }),
      })
      if (!res.ok) await cargar()
    } catch (err) {
      console.error('[toggleActivo]', err)
      await cargar()
    } finally {
      setCambiando(null)
    }
  }

  const activos = gooals.filter(g => g.activo).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#1DE9B6', fontWeight: 700, marginBottom: 6 }}>
            Catálogo Gooals V2
          </p>
          <span style={{ fontSize: 12, color: '#888888' }}>
            <span style={{ color: '#1DE9B6', fontWeight: 700 }}>{activos}</span> activos de {gooals.length}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowIA(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: 10,
              background: 'transparent', border: '1px solid #1DE9B6', color: '#1DE9B6',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            <Sparkles style={{ width: 13, height: 13 }} /> Generar con IA
          </button>
          <button
            onClick={() => setShowNuevo(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: 10,
              background: '#1DE9B6', color: '#0A0A0A', fontSize: 12, fontWeight: 600,
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            <Plus style={{ width: 13, height: 13 }} /> Nuevo Gooal
          </button>
        </div>
      </div>

      {error && <p style={{ fontSize: 13, color: '#C97B7B', marginBottom: 12 }}>{error}</p>}

      <div style={{ overflowX: 'auto', marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
        <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Título', 'Categoría', 'Dificultad', 'Puntos', 'Completado', 'Activo'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.14em',
                  color: '#1DE9B6', fontWeight: 600, paddingBottom: 8, paddingRight: 14, whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gooals.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '24px 0', color: '#444444', textAlign: 'center' }}>
                  Aún no hay gooals. Crea uno o genera 20 con IA.
                </td>
              </tr>
            ) : gooals.map((g, i) => {
              const color = CATEGORIA_COLOR[g.categoria] ?? '#666666'
              const meta = DIFICULTAD_META[g.dificultad]
              return (
                <tr key={g.id} style={{ background: i % 2 === 0 ? '#0A0A0A' : '#141414', opacity: g.activo ? 1 : 0.5 }}>
                  <td style={{ padding: '10px 14px 10px 0', color: '#F0F0F0', maxWidth: 280 }}>{g.titulo}</td>
                  <td style={{ padding: '10px 14px 10px 0' }}>
                    <span style={{
                      fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em',
                      color, background: `${color}22`, borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap',
                    }}>
                      {CATEGORIA_LABEL[g.categoria] ?? g.categoria}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px 10px 0', color: meta?.color ?? '#888888', whiteSpace: 'nowrap' }}>
                    {meta ? `${meta.emoji} ${meta.label}` : g.dificultad}
                  </td>
                  <td style={{ padding: '10px 14px 10px 0', color: '#1DE9B6', fontWeight: 700, textAlign: 'center' }}>
                    +{g.puntos}
                  </td>
                  <td style={{ padding: '10px 14px 10px 0', color: '#F0F0F0', textAlign: 'center' }}>
                    {g.veces_completado}
                  </td>
                  <td style={{ padding: '10px 0' }}>
                    <button
                      onClick={() => toggleActivo(g)}
                      disabled={cambiando === g.id}
                      aria-pressed={g.activo}
                      style={{
                        padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${g.activo ? '#1DE9B6' : '#2A2A2A'}`,
                        background: g.activo ? 'rgba(29,233,182,0.12)' : 'transparent',
                        color: g.activo ? '#1DE9B6' : '#666666',
                        opacity: cambiando === g.id ? 0.5 : 1, whiteSpace: 'nowrap',
                      }}
                    >
                      {g.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showNuevo && <NuevoGooalModal onClose={() => setShowNuevo(false)} onSaved={cargar} />}
      {showIA && <GenerarIAModal onClose={() => setShowIA(false)} onSaved={cargar} />}
    </div>
  )
}
