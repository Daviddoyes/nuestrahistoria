'use client'

import { ChevronRight } from 'lucide-react'
import { MARCA, RADIO, SUPERFICIE, TEXTO } from '@/lib/estilo'
import type { EstadoUserGooal, LineaPerfil } from '@/types/gooals'

/**
 * Lo que tenéis en común, que NO es una cosa: son tres.
 *
 * ── POR QUÉ DEJÓ DE SER UN FILTRO ─────────────────────────
 *
 * Antes era una pastilla que estrechaba la lista que estuvieras mirando. El
 * problema es que una pastilla solo puede enseñar UNA cosa, y "en común" cruza
 * dos listas por dos personas, así que son tres relaciones y cada una se lee de
 * una manera distinta:
 *
 *   los dos lo tenéis PENDIENTE   → un plan. Es lo único que acaba en hacer algo.
 *   ella lo hizo y tú lo quieres  → alguien a quien preguntar.
 *   los dos lo habéis HECHO       → vuestro pasado, que es lo que os parece.
 *
 * Solo la primera va en verde. Las otras dos son para saber, no para hacer, y
 * pintarlas igual sería prometer un plan donde no lo hay.
 *
 * ── Y LA REGLA DE LOS CEROS ───────────────────────────────
 *
 * **Una fila con cero no se enseña.** Ni aunque las otras tengan número: un "0"
 * en verde arriba del todo es exactamente lo que quitamos de la pantalla del
 * día uno. Si no queda ninguna, va una sola línea diciéndolo, que es mejor que
 * tres ceros en fila.
 */

export type RelacionEnComun = 'juntos' | 'ella' | 'pasado'

type Props = {
  /** Las listas de ESA persona, tal como llegan del perfil. */
  conseguidos: LineaPerfil[]
  pendientes: LineaPerfil[]
  /** MIS estados, para cruzar. Es lo que convierte dos listas en tres relaciones. */
  misEstados: Record<string, EstadoUserGooal>
  nombre: string
  onAbrirRelacion: (relacion: RelacionEnComun) => void
}

/**
 * Las tres relaciones, con sus gooals. Se calcula aquí y no en el servidor
 * porque los datos ya están los dos en la pantalla: las listas de esa persona y
 * mis estados. No hace falta ni una consulta más.
 */
export function cruzar(
  conseguidos: LineaPerfil[],
  pendientes: LineaPerfil[],
  misEstados: Record<string, EstadoUserGooal>,
): Record<RelacionEnComun, LineaPerfil[]> {
  return {
    juntos: pendientes.filter(l => misEstados[l.gooal.id] === 'pendiente'),
    ella: conseguidos.filter(l => misEstados[l.gooal.id] === 'pendiente'),
    pasado: conseguidos.filter(l => misEstados[l.gooal.id] === 'completado'),
  }
}

/** El texto de cada fila. El nombre entra en la de en medio, que es sobre ella. */
function textos(relacion: RelacionEnComun, nombre: string) {
  switch (relacion) {
    case 'juntos': return { titulo: 'Podéis hacerlo juntos', pie: 'Los dos lo tenéis pendiente' }
    case 'ella': return { titulo: `${nombre} ya lo ha hecho`, pie: 'Puedes preguntarle' }
    case 'pasado': return { titulo: 'Los dos lo habéis hecho', pie: 'Vuestro pasado juntos' }
  }
}

const ORDEN: RelacionEnComun[] = ['juntos', 'ella', 'pasado']

export default function EnComun({ conseguidos, pendientes, misEstados, nombre, onAbrirRelacion }: Props) {
  const grupos = cruzar(conseguidos, pendientes, misEstados)
  const conAlgo = ORDEN.filter(r => grupos[r].length > 0)

  if (conAlgo.length === 0) {
    return (
      <p style={{ fontSize: TEXTO.cuerpo, color: MARCA.stone, lineHeight: 1.5, paddingTop: 20, textAlign: 'center' }}>
        Todavía no tenéis nada en común.
      </p>
    )
  }

  return (
    <div
      style={{
        marginTop: 16, borderRadius: RADIO.tarjeta, overflow: 'hidden',
        background: SUPERFICIE.panel, border: `1px solid ${SUPERFICIE.linea}`,
      }}
    >
      {conAlgo.map((relacion, i) => {
        const { titulo, pie } = textos(relacion, nombre)
        // Solo la primera relación es un plan, y solo si de verdad es la de los
        // dos pendientes: si esa no tiene nada, la de arriba es otra y NO va en
        // verde por estar la primera.
        const esPlan = relacion === 'juntos'
        return (
          <button
            key={relacion}
            onClick={() => onAbrirRelacion(relacion)}
            className="w-full transition-colors active:bg-[#1C201E]"
            style={{
              display: 'flex', alignItems: 'center', gap: 14, height: 74, padding: '0 16px',
              textAlign: 'left',
              ...(i > 0 ? { borderTop: `1px solid ${SUPERFICIE.linea}` } : {}),
            }}
          >
            <span
              className="fuente-titular"
              style={{
                width: 36, flexShrink: 0, textAlign: 'center', lineHeight: 1,
                fontSize: 24, fontWeight: 700, letterSpacing: '-.03em',
                color: esPlan ? MARCA.aurora : MARCA.sand,
              }}
            >
              {grupos[relacion].length}
            </span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ display: 'block', fontSize: TEXTO.cuerpoGrande, fontWeight: 600, color: MARCA.sand }}>
                {titulo}
              </span>
              <span style={{ display: 'block', fontSize: TEXTO.pie, color: MARCA.stone, marginTop: 2 }}>
                {pie}
              </span>
            </span>
            <ChevronRight aria-hidden style={{ flexShrink: 0, width: 16, height: 16, color: SUPERFICIE.apagado }} />
          </button>
        )
      })}
    </div>
  )
}

/** El encabezado de la lista de una relación, con la vuelta a las tres filas. */
export function CabeceraRelacion({
  relacion, nombre, cuantos, onVolver,
}: { relacion: RelacionEnComun; nombre: string; cuantos: number; onVolver: () => void }) {
  const { titulo } = textos(relacion, nombre)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 14 }}>
      <button
        onClick={onVolver}
        className="text-[#00D1A7] active:opacity-60 transition-opacity"
        style={{ fontSize: TEXTO.cuerpo, fontWeight: 600, minHeight: 44, display: 'flex', alignItems: 'center' }}
      >
        ← En común
      </button>
      <span style={{ marginLeft: 'auto', fontSize: TEXTO.pie, color: MARCA.stone }}>
        {titulo} · {cuantos}
      </span>
    </div>
  )
}
