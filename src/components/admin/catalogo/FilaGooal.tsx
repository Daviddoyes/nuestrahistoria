'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Check, MapPin, Trash2 } from 'lucide-react'
import {
  CATEGORIAS, CATEGORIA_COLOR, CATEGORIA_LABEL, DIFICULTAD_META, dificultadDePuntos,
} from '@/lib/gooals'
import type { GooalAdmin } from '@/types/gooals'
import SelectorPuntos from '../SelectorPuntos'

// Leaflet toca `window` al cargarse: solo en el navegador, y solo al abrir un pin.
const MiniMapaPin = dynamic(() => import('./MiniMapaPin'), {
  ssr: false,
  loading: () => <div style={{ height: 200, borderRadius: 10, background: '#1E2120' }} />,
})

/** Lo que se ha tocado en una fila y aún no se ha guardado. */
export type BorradorFila = Partial<Pick<GooalAdmin, 'titulo' | 'puntos' | 'categoria' | 'ambito' | 'ciudad' | 'pais'>>

type Props = {
  gooal: GooalAdmin
  borrador: BorradorFila | undefined
  seleccionado: boolean
  mapaAbierto: boolean
  onEditar: (id: string, cambio: BorradorFila) => void
  onDescartar: (id: string) => void
  /** La fila tal como ha quedado en la base tras guardar. */
  onGuardado: (gooal: GooalAdmin) => void
  onSeleccionar: (id: string, seleccionado: boolean) => void
  onMapa: (id: string | null) => void
  onPedirBorrar: (gooal: GooalAdmin) => void
}

type Guardado = { fase: 'nada' } | { fase: 'guardando' } | { fase: 'hecho' } | { fase: 'error'; mensaje: string }

const campo: React.CSSProperties = {
  padding: '8px 10px', borderRadius: 8, border: '1px solid #2A2E2C', background: '#0B0B0B',
  color: '#FFFFFF', fontSize: 13, minHeight: 38, minWidth: 0,
}

const aviso: React.CSSProperties = {
  fontSize: 12, lineHeight: 1.4, padding: '6px 9px', borderRadius: 8,
}

/** Texto de un input tal como lo guardará el servidor: sin espacios, y vacío es "sin valor". */
const normalizar = (valor: string | null | undefined) => (valor ?? '').trim() || null

/** Una fila de la lista de trabajo: se corrige, se guarda y se verifica sin salir de ella. */
export default function FilaGooal({
  gooal, borrador, seleccionado, mapaAbierto, onEditar, onDescartar, onGuardado, onSeleccionar, onMapa, onPedirBorrar,
}: Props) {
  const [guardado, setGuardado] = useState<Guardado>({ fase: 'nada' })

  const v = { ...gooal, ...borrador }
  const hayCambios = Boolean(borrador && Object.keys(borrador).length > 0)
  const dificultad = dificultadDePuntos(v.puntos)
  const meta = dificultad ? DIFICULTAD_META[dificultad] : null
  const tienePin = gooal.lat !== null && gooal.lng !== null
  const ocupado = guardado.fase === 'guardando'

  const cambiaLugar = tienePin && v.ambito === 'lugar' && (
    (borrador?.ciudad !== undefined && normalizar(borrador.ciudad) !== gooal.ciudad) ||
    (borrador?.pais !== undefined && normalizar(borrador.pais) !== gooal.pais)
  )

  /**
   * Guarda lo editado y, si se pide, también el estado o el activo. "Verificar"
   * pasa por aquí a propósito: lo normal es corregir y verificar de un tirón, y
   * verificar sin guardar lo corregido dejaría publicado lo de antes.
   */
  const guardar = async (extra: { estado?: GooalAdmin['estado']; activo?: boolean } = {}) => {
    setGuardado({ fase: 'guardando' })
    try {
      const res = await fetch('/api/admin/gooals-v2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: gooal.id, ...borrador, ...extra }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.gooal) throw new Error(json.error ?? 'No se pudo guardar. Inténtalo de nuevo.')
      onGuardado(json.gooal as GooalAdmin)
      setGuardado({ fase: 'hecho' })
      setTimeout(() => setGuardado(g => (g.fase === 'hecho' ? { fase: 'nada' } : g)), 2500)
    } catch (e) {
      // Lo escrito NO se pierde: el borrador sigue en el padre hasta que se guarde bien.
      setGuardado({ fase: 'error', mensaje: e instanceof Error ? e.message : 'No se pudo guardar.' })
    }
  }

  return (
    <li
      style={{
        listStyle: 'none', background: seleccionado ? 'rgba(0,209,167,0.06)' : '#161817',
        border: `1px solid ${hayCambios ? 'rgba(0,209,167,0.45)' : '#2A2E2C'}`,
        borderRadius: 12, padding: 12, opacity: gooal.activo ? 1 : 0.6,
      }}
    >
      {/* ── Selección, título y estado ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ width: 32, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={seleccionado}
            onChange={e => onSeleccionar(gooal.id, e.target.checked)}
            aria-label={`Seleccionar ${gooal.titulo}`}
            style={{ width: 18, height: 18, accentColor: '#00D1A7' }}
          />
        </label>
        <input
          value={v.titulo}
          onChange={e => onEditar(gooal.id, { titulo: e.target.value })}
          aria-label="Título"
          style={{ ...campo, flex: 1, fontSize: 14, fontWeight: 600 }}
        />
        <span
          style={{
            flexShrink: 0, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '4px 8px', borderRadius: 999,
            color: gooal.estado === 'verificado' ? '#00D1A7' : '#FFD54F',
            background: gooal.estado === 'verificado' ? 'rgba(0,209,167,0.12)' : 'rgba(255,213,79,0.12)',
          }}
        >
          {gooal.estado}
        </span>
      </div>

      {/* ── Puntos y dificultad ── */}
      <div style={{ marginTop: 10, paddingLeft: 40 }}>
        <SelectorPuntos compacto valor={v.puntos} onCambiar={puntos => onEditar(gooal.id, { puntos })} />
        {meta && dificultad !== gooal.dificultad && (
          <p style={{ fontSize: 11, color: '#7A8A85', marginTop: 2 }}>
            Antes: {DIFICULTAD_META[gooal.dificultad]?.label ?? gooal.dificultad}
          </p>
        )}
      </div>

      {/* ── Categoría, ámbito, ciudad y país ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6, marginTop: 10, paddingLeft: 40 }}>
        <select
          aria-label="Categoría"
          value={v.categoria}
          onChange={e => onEditar(gooal.id, { categoria: e.target.value as GooalAdmin['categoria'] })}
          style={{ ...campo, color: CATEGORIA_COLOR[v.categoria] }}
        >
          {CATEGORIAS.map(c => <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>)}
        </select>
        <select
          aria-label="Ámbito"
          value={v.ambito}
          onChange={e => onEditar(gooal.id, { ambito: e.target.value as GooalAdmin['ambito'] })}
          style={campo}
        >
          <option value="lugar">Lugar</option>
          <option value="personal">Personal</option>
        </select>
        <input
          value={v.ciudad ?? ''}
          onChange={e => onEditar(gooal.id, { ciudad: e.target.value })}
          placeholder="Ciudad"
          aria-label="Ciudad"
          style={campo}
        />
        <input
          value={v.pais ?? ''}
          onChange={e => onEditar(gooal.id, { pais: e.target.value })}
          placeholder="País"
          aria-label="País"
          style={campo}
        />
      </div>

      {/* ── Avisos de lo que va a pasar al guardar ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, paddingLeft: 40 }}>
        {v.ambito === 'personal' && tienePin && (
          <p style={{ ...aviso, color: '#FFD54F', background: 'rgba(255,213,79,0.1)' }}>
            Al guardar como personal se le quitará el pin: si no es un sitio, sobra.
          </p>
        )}
        {cambiaLugar && (
          <p style={{ ...aviso, color: '#FFD54F', background: 'rgba(255,213,79,0.1)' }}>
            El pin no se mueve con la ciudad o el país: quedará marcado para rehacerlo.
          </p>
        )}
        {v.ambito === 'lugar' && !tienePin && (
          <p style={{ ...aviso, color: '#A3B1AC', background: '#1E2120' }}>
            Sin pin: si se verifica, saldrá en Explorar pero no en el mapa.
          </p>
        )}
      </div>

      {/* ── Pin y gente ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 8, paddingLeft: 40, fontSize: 12, color: '#A3B1AC' }}>
        {gooal.ambito === 'lugar' && tienePin && (
          <button
            type="button"
            onClick={() => onMapa(mapaAbierto ? null : gooal.id)}
            aria-expanded={mapaAbierto}
            style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#00D1A7', minHeight: 32, fontWeight: 600 }}
          >
            <MapPin style={{ width: 13, height: 13 }} /> {mapaAbierto ? 'Ocultar pin' : 'Ver pin'}
          </button>
        )}
        {gooal.geo === 'rehacer' && (
          <span style={{ color: '#FFD54F', fontWeight: 600 }}>Pin por rehacer</span>
        )}
        {gooal.geo === 'solo-ciudad' && tienePin && <span>Pin en el centro de la ciudad</span>}
        <span>
          <strong style={{ color: '#FFFFFF' }}>{gooal.conquistados}</strong>{' '}
          {gooal.conquistados === 1 ? 'lo ha conquistado' : 'lo han conquistado'}
          {gooal.enListas > gooal.conquistados && ` · ${gooal.enListas - gooal.conquistados} en su lista`}
        </span>
      </div>

      {mapaAbierto && tienePin && (
        <div style={{ marginTop: 8, paddingLeft: 40 }}>
          <MiniMapaPin lat={gooal.lat as number} lng={gooal.lng as number} color={CATEGORIA_COLOR[gooal.categoria]} />
        </div>
      )}

      {/* ── Acciones ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10, paddingLeft: 40 }}>
        <button
          type="button"
          onClick={() => guardar()}
          disabled={!hayCambios || ocupado}
          style={{
            minHeight: 38, padding: '0 14px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
            background: hayCambios ? '#00D1A7' : '#2A2E2C', color: hayCambios ? '#0B0B0B' : '#7A8A85',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {ocupado && <span className="w-3.5 h-3.5 border-2 border-[#0B0B0B] border-t-transparent rounded-full animate-spin" />}
          Guardar
        </button>

        {hayCambios && !ocupado && (
          <button
            type="button"
            onClick={() => { onDescartar(gooal.id); setGuardado({ fase: 'nada' }) }}
            style={{ minHeight: 38, padding: '0 10px', fontSize: 13, color: '#7A8A85' }}
          >
            Descartar
          </button>
        )}

        <button
          type="button"
          onClick={() => guardar({ estado: gooal.estado === 'verificado' ? 'borrador' : 'verificado' })}
          disabled={ocupado}
          style={{
            minHeight: 38, padding: '0 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: `1px solid ${gooal.estado === 'verificado' ? '#2A2E2C' : '#00D1A7'}`,
            color: gooal.estado === 'verificado' ? '#A3B1AC' : '#00D1A7',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          {gooal.estado === 'verificado'
            ? 'Mandar a borrador'
            : <><Check style={{ width: 14, height: 14 }} /> {hayCambios ? 'Guardar y verificar' : 'Verificar'}</>}
        </button>

        <button
          type="button"
          onClick={() => guardar({ activo: !gooal.activo })}
          disabled={ocupado}
          title="Un gooal inactivo no sale en la app aunque esté verificado"
          style={{ minHeight: 38, padding: '0 10px', borderRadius: 8, border: '1px solid #2A2E2C', fontSize: 12, color: '#A3B1AC' }}
        >
          {gooal.activo ? 'Activo' : 'Inactivo'}
        </button>

        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {gooal.enListas > 0 && (
            <span style={{ fontSize: 11, color: '#7A8A85' }}>
              No se puede borrar: {gooal.enListas === 1 ? '1 persona lo tiene' : `${gooal.enListas} personas lo tienen`}
            </span>
          )}
          <button
            type="button"
            onClick={() => onPedirBorrar(gooal)}
            disabled={gooal.enListas > 0 || ocupado}
            aria-label={gooal.enListas > 0 ? 'No se puede borrar: alguien lo tiene' : 'Borrar gooal'}
            style={{
              width: 38, height: 38, borderRadius: 8, border: '1px solid #2A2E2C',
              color: gooal.enListas > 0 ? '#2A2E2C' : '#FF5252',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: gooal.enListas > 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <Trash2 style={{ width: 15, height: 15 }} />
          </button>
        </span>
      </div>

      {guardado.fase === 'hecho' && (
        <p role="status" style={{ ...aviso, marginTop: 8, marginLeft: 40, color: '#00D1A7', background: 'rgba(0,209,167,0.1)' }}>
          Guardado ✓
        </p>
      )}
      {guardado.fase === 'error' && (
        <p role="alert" style={{ ...aviso, marginTop: 8, marginLeft: 40, color: '#FF5252', background: 'rgba(255,82,82,0.14)' }}>
          {guardado.mensaje} Lo que has escrito sigue aquí.
        </p>
      )}
    </li>
  )
}
