'use client'

import { useRef, useState } from 'react'
import { Check, Pencil, Sparkles, X } from 'lucide-react'
import { REGLAS_GOOAL } from '@/lib/criterio-gooals'
import type { GooalAdmin } from '@/types/gooals'

type Props = {
  gooal: GooalAdmin
  /** La fila tal como queda en la base tras decidir. */
  onGuardado: (gooal: GooalAdmin) => void
  /** La fila está ocupada guardando otra cosa. */
  ocupado: boolean
}

type Fase = { f: 'ver' } | { f: 'editando' } | { f: 'enviando' } | { f: 'error'; mensaje: string }

const caja: React.CSSProperties = {
  marginTop: 10, marginLeft: 40, padding: '10px 12px', borderRadius: 10,
  background: 'rgba(0,209,167,0.07)', border: '1px solid rgba(0,209,167,0.35)',
}

const boton: React.CSSProperties = {
  minHeight: 36, padding: '0 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  display: 'flex', alignItems: 'center', gap: 5,
}

const HECHO: Record<string, string> = {
  aceptado: 'Propuesta aceptada',
  editado: 'Título reescrito a mano',
  descartado: 'Propuesta descartada: el título se queda como estaba',
}

/**
 * La propuesta de título de la IA, con la decisión de David.
 *
 * La IA juzga y propone; aquí no se aplica nada solo. Al decidir, el servidor
 * devuelve la fila ya cambiada y se pinta solo esa: aceptar cuarenta títulos
 * seguidos no recarga la lista ni una vez.
 */
export default function PropuestaTitulo({ gooal, onGuardado, ocupado }: Props) {
  const [fase, setFase] = useState<Fase>({ f: 'ver' })
  const entrada = useRef<HTMLInputElement>(null)
  const revision = gooal.revision

  if (!revision || revision.estado === 'ok') return null

  // Ya decidida: se queda a la vista en vez de desaparecer de golpe, para saber
  // por dónde ibas cuando estás repasando muchas seguidas.
  if (revision.estado !== 'pendiente') {
    return (
      <p style={{ ...caja, fontSize: 12, color: '#7A8A85', background: '#1E2120', border: '1px solid #2A2E2C' }}>
        {HECHO[revision.estado] ?? revision.estado}
        {revision.titulo_final && revision.titulo_final !== revision.titulo_original && (
          <> · antes: «{revision.titulo_original}»</>
        )}
      </p>
    )
  }

  const regla = revision.regla ? REGLAS_GOOAL[revision.regla - 1] : null
  // Lo juzgó sobre otro texto: alguien cambió el título después de la pasada.
  const cambiado = revision.titulo_original !== gooal.titulo
  const enviando = fase.f === 'enviando'
  /**
   * Señalado pero sin recambio: la IA vio el fallo y no encontró arreglo que
   * dejara el mismo gooal. No hay nada que "aceptar"; o lo escribes tú, o se
   * queda como está.
   */
  const propuesta = revision.titulo_propuesto

  const decidir = async (accion: 'aceptar' | 'editar' | 'descartar', titulo?: string) => {
    setFase({ f: 'enviando' })
    try {
      const res = await fetch('/api/admin/revision', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: gooal.id, accion, titulo }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.gooal) throw new Error(json.error ?? 'No se pudo guardar la decisión.')
      onGuardado(json.gooal as GooalAdmin)
      setFase({ f: 'ver' })
    } catch (e) {
      setFase({ f: 'error', mensaje: e instanceof Error ? e.message : 'No se pudo guardar la decisión.' })
    }
  }

  return (
    <div style={{ ...caja, ...(propuesta ? null : { background: 'rgba(255,213,79,0.07)', border: '1px solid rgba(255,213,79,0.35)' }) }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: propuesta ? '#00D1A7' : '#FFD54F', display: 'flex', alignItems: 'center', gap: 5 }}>
        <Sparkles aria-hidden style={{ width: 12, height: 12 }} strokeWidth={1.75} />
        {!propuesta
          ? 'Señalado, sin propuesta'
          : revision.tipo === 'traduccion' ? 'Cómo está escrito el título' : 'Propuesta de la IA'}
      </p>

      <p style={{ fontSize: propuesta ? 15 : 13, fontWeight: propuesta ? 700 : 400, color: propuesta ? '#FFFFFF' : '#A3B1AC', lineHeight: 1.35, margin: '6px 0' }}>
        {propuesta ?? 'La IA no ve cómo arreglarlo sin convertirlo en otro gooal. Escríbelo tú o déjalo como está.'}
      </p>

      <p style={{ fontSize: 12, lineHeight: 1.45, color: '#A3B1AC' }}>
        {regla && <strong style={{ color: '#FFD54F' }}>Regla {revision.regla}, {regla.titulo.toLowerCase()}. </strong>}
        {revision.motivo}
      </p>

      {gooal.enListas > 0 && (
        <p style={{ fontSize: 12, lineHeight: 1.45, color: '#FFD54F', background: 'rgba(255,213,79,0.1)', borderRadius: 8, padding: '6px 9px', marginTop: 8 }}>
          Ojo: {gooal.conquistados > 0
            ? `${gooal.conquistados === 1 ? 'alguien ya lo ha conquistado' : `${gooal.conquistados} personas ya lo han conquistado`}`
            : `${gooal.enListas === 1 ? 'alguien lo tiene en su lista' : `${gooal.enListas} personas lo tienen en su lista`}`}.
          Cambiar el título le cambia lo que ve en su perfil.
        </p>
      )}

      {cambiado && (
        <p style={{ fontSize: 12, lineHeight: 1.45, color: '#FFD54F', background: 'rgba(255,213,79,0.1)', borderRadius: 8, padding: '6px 9px', marginTop: 8 }}>
          La IA juzgó «{revision.titulo_original}», y el título ya no es ese. Míralo antes de aceptar.
        </p>
      )}

      {fase.f === 'editando' ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          <input
            ref={entrada}
            // Sin propuesta se parte del título actual: es lo que hay que
            // retocar, y empezar con el campo en blanco obliga a reescribirlo.
            defaultValue={propuesta ?? gooal.titulo}
            aria-label="Título a mano"
            maxLength={200}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); decidir('editar', e.currentTarget.value) }
              if (e.key === 'Escape') { e.preventDefault(); setFase({ f: 'ver' }) }
            }}
            style={{
              flex: 1, minWidth: 200, padding: '8px 10px', borderRadius: 8, border: '1px solid #00D1A7',
              background: '#0B0B0B', color: '#FFFFFF', fontSize: 14, fontWeight: 600, minHeight: 38,
            }}
          />
          <button
            type="button"
            onClick={() => decidir('editar', entrada.current?.value)}
            disabled={enviando}
            style={{ ...boton, border: 'none', background: '#00D1A7', color: '#0B0B0B' }}
          >
            <Check style={{ width: 14, height: 14 }} /> Guardar
          </button>
          <button type="button" onClick={() => setFase({ f: 'ver' })} style={{ ...boton, color: '#7A8A85' }}>
            Cancelar
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {/* Sin propuesta no hay nada que aceptar: el botón no existe, en vez
              de estar ahí apagado invitando a pulsarlo. */}
          {propuesta && (
            <button
              type="button"
              onClick={() => decidir('aceptar')}
              disabled={enviando || ocupado}
              style={{ ...boton, border: 'none', background: '#00D1A7', color: '#0B0B0B' }}
            >
              {enviando
                ? <span className="w-3.5 h-3.5 border-2 border-[#0B0B0B] border-t-transparent rounded-full animate-spin" />
                : <Check style={{ width: 14, height: 14 }} />}
              Aceptar
            </button>
          )}
          <button
            type="button"
            // El foco va al input en cuanto aparece: es el botón que más se usa y
            // así se escribe sin volver a tocar la pantalla.
            onClick={() => { setFase({ f: 'editando' }); setTimeout(() => entrada.current?.select(), 0) }}
            disabled={enviando || ocupado}
            style={{ ...boton, border: '1px solid #00D1A7', color: '#00D1A7' }}
          >
            <Pencil style={{ width: 14, height: 14 }} /> {propuesta ? 'Editar' : 'Escribirlo yo'}
          </button>
          <button
            type="button"
            onClick={() => decidir('descartar')}
            disabled={enviando || ocupado}
            style={{ ...boton, border: '1px solid #2A2E2C', color: '#A3B1AC' }}
          >
            <X style={{ width: 14, height: 14 }} /> Descartar
          </button>
        </div>
      )}

      {fase.f === 'error' && (
        <p role="alert" style={{ fontSize: 12, lineHeight: 1.4, color: '#FF5252', background: 'rgba(255,82,82,0.14)', borderRadius: 8, padding: '6px 9px', marginTop: 8 }}>
          {fase.mensaje}
        </p>
      )}
    </div>
  )
}
