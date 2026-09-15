'use client'

import { useState } from 'react'
import { Plus, X, Sparkles } from 'lucide-react'
import {
  CATEGORIAS, CATEGORIA_LABEL, DIFICULTAD_META, PUNTOS_MIN,
  dificultadDePuntos, puntosEnEscala, type CategoriaGooal,
} from '@/lib/gooals'
import SelectorPuntos from './SelectorPuntos'
import ListaTrabajo from './catalogo/ListaTrabajo'

const HEADERS = { 'Content-Type': 'application/json' }

type GooalGenerado = {
  titulo: string
  descripcion: string
  categoria: string
  ciudad: string
  pais: string
  puntos: number
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 10,
  border: '1px solid #2A2E2C', background: '#2A2E2C', color: '#FFFFFF', fontSize: 14, outline: 'none',
}
const labelStyle: React.CSSProperties = {
  fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7A8A85',
  marginBottom: 5, display: 'block',
}
const btnPrimary: React.CSSProperties = {
  padding: '12px 0', borderRadius: 10, background: '#00D1A7', color: '#0B0B0B',
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
        background: '#1E2120', border: '1px solid #2A2E2C', borderRadius: 16, padding: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#00D1A7', fontWeight: 700 }}>
            {title}
          </p>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: '#7A8A85', cursor: 'pointer', padding: 4 }}>
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
    titulo: '', descripcion: '', categoria: 'viajes' as CategoriaGooal,
    puntos: PUNTOS_MIN,
    ciudad: '', pais: 'España', imagen_url: '', activo: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const guardar = async () => {
    if (!f.titulo.trim()) { setError('El título es obligatorio'); return }
    if (puntosEnEscala(f.puntos) === null) { setError('Los puntos van de 1 a 10'); return }
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

        <div>
          <label style={labelStyle}>Categoría</label>
          <select style={inputStyle} value={f.categoria}
            onChange={e => setF({ ...f, categoria: e.target.value as CategoriaGooal })}>
            {CATEGORIAS.map(c => <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Puntos (la dificultad sale de aquí)</label>
          <SelectorPuntos valor={f.puntos} onCambiar={puntos => setF({ ...f, puntos })} />
        </div>

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

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#A3B1AC', cursor: 'pointer' }}>
          <input type="checkbox" checked={f.activo} onChange={e => setF({ ...f, activo: e.target.checked })} />
          Activo (visible en Explorar)
        </label>

        {error && <p style={{ fontSize: 13, color: '#FF5252' }}>{error}</p>}
        <button style={{ ...btnPrimary, opacity: saving ? 0.5 : 1 }} disabled={saving} onClick={guardar}>
          {saving ? 'Guardando...' : 'Crear gooal'}
        </button>
      </div>
    </ModalShell>
  )
}

// ── Generar con IA ───────────────────────────────────────────
function GenerarIAModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [categoria, setCategoria] = useState<CategoriaGooal>('viajes')
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
            ...btnPrimary, background: 'transparent', color: '#00D1A7',
            border: '1px solid #00D1A7', opacity: generando ? 0.5 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {generando
            ? <span style={{ width: 14, height: 14, border: '2px solid #00D1A7', borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin" />
            : <Sparkles style={{ width: 14, height: 14 }} />
          }
          {generando ? 'Generando...' : generados ? 'Volver a generar' : 'Generar'}
        </button>

        {error && <p style={{ fontSize: 13, color: '#FF5252' }}>{error}</p>}

        {generados && (
          <>
            <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {generados.map((g, i) => {
                const dificultad = dificultadDePuntos(g.puntos)
                const meta = dificultad ? DIFICULTAD_META[dificultad] : null
                return (
                  <div key={i} style={{ background: '#2A2E2C', borderRadius: 8, padding: '8px 10px' }}>
                    <p style={{ fontSize: 13, color: '#FFFFFF' }}>{g.titulo}</p>
                    <p style={{ fontSize: 11, color: '#7A8A85', marginTop: 2 }}>
                      {meta?.emoji} {meta?.label} · <span style={{ color: '#00D1A7' }}>+{g.puntos} pts</span>
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
              {guardando ? 'Guardando...' : `Guardar los ${generados.length} como borrador`}
            </button>
          </>
        )}
      </div>
    </ModalShell>
  )
}

// ── Sección ──────────────────────────────────────────────────
/**
 * Catálogo del panel. Antes era una tabla que se traía los 4.726 gooals de golpe;
 * ahora es la lista de trabajo (50 por página, con filtros), y conserva arriba los
 * botones de alta.
 */
export default function GooalsV2Section() {
  const [showNuevo, setShowNuevo] = useState(false)
  const [showIA, setShowIA] = useState(false)
  // Tras crear gooals se vuelve a pedir la página de la lista.
  const [recarga, setRecarga] = useState(0)
  const recargar = () => setRecarga(n => n + 1)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#00D1A7', fontWeight: 700, marginBottom: 6 }}>
            Catálogo
          </p>
          <span style={{ fontSize: 12, color: '#A3B1AC' }}>Buscar, corregir y verificar</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowIA(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: 10,
              background: 'transparent', border: '1px solid #00D1A7', color: '#00D1A7',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            <Sparkles style={{ width: 13, height: 13 }} /> Generar con IA
          </button>
          <button
            onClick={() => setShowNuevo(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: 10,
              background: '#00D1A7', color: '#0B0B0B', fontSize: 12, fontWeight: 600,
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            <Plus style={{ width: 13, height: 13 }} /> Nuevo Gooal
          </button>
        </div>
      </div>

      <ListaTrabajo recarga={recarga} />

      {showNuevo && <NuevoGooalModal onClose={() => setShowNuevo(false)} onSaved={recargar} />}
      {showIA && <GenerarIAModal onClose={() => setShowIA(false)} onSaved={recargar} />}
    </div>
  )
}
