'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { CATEGORIA_COLOR, CATEGORIA_LABEL, type CategoriaGooal } from '@/lib/gooals'
import type { LineaPerfil } from '@/types/gooals'
import BotonVerMas, { POR_TANDA } from './BotonVerMas'

type Props = {
  lineas: LineaPerfil[]
  /**
   * Si esta lista es la de conseguidos. Decide cómo se dibuja la cámara, y no
   * se deduce de la línea a propósito: la lista entera es de un estado, y una
   * línea no debería tener que saber en qué pestaña está.
   */
  conseguidos: boolean
  onAbrir: (linea: LineaPerfil) => void
  /** La categoría por la que se está filtrando, o null. */
  filtro?: CategoriaGooal | null
  onQuitarFiltro?: () => void
}

/**
 * Las dos listas del perfil: una línea por gooal, la misma pantalla para lo
 * conseguido y lo pendiente, y la misma en tu perfil que en el de otra persona.
 *
 * ── POR QUÉ UNA LISTA Y NO UNA REJILLA DE FOTOS ───────────
 *
 * Casi todos los gooals llevan la foto del catálogo, que es la misma para todo
 * el mundo. Una rejilla de esas fotos hacía que todos los perfiles se vieran
 * iguales: la cuadrícula del catálogo repetida. En una lista de títulos se lee a
 * la persona, que es lo que un perfil tiene que contar.
 *
 * ── Y POR QUÉ ESTO NO PIDE NINGUNA FOTO ───────────────────
 *
 * Las fotos de la gente están en un cubo privado: cada una necesita una
 * dirección firmada, pedida al servidor y con caducidad. Aquí no se pinta
 * ninguna, así que no se firma ninguna: un perfil de 300 gooals cuesta lo mismo
 * que uno de 3. Si algún día esto necesita <FotoPrivada>, es que se ha colado
 * una foto donde no va.
 *
 * El iconito de cámara dice "esta persona guardó su propia foto, y tú puedes
 * verla". Las dos cosas: quien no pueda verla no ve la cámara, porque enseñar
 * una cámara que al tocarla no lleva a ninguna foto es prometer y no cumplir.
 */
export default function ListaPerfil({ lineas, conseguidos, onAbrir, filtro = null, onQuitarFiltro }: Props) {
  // De 60 en 60: hay perfiles con cientos de líneas.
  const [visibles, setVisibles] = useState(POR_TANDA)

  return (
    <>
      {/* ── LA PASTILLA DEL FILTRO ────────────────────────
          NO es lo que eran las `PastillasCategorias` que se retiraron. Aquellas
          eran un MENÚ de filtros, siempre presente, que invitaba a filtrar.
          Ésta aparece SOLO cuando ya hay un filtro puesto, y lo que hace es
          decir dónde estás y por dónde se sale. Una es una puerta y la otra es
          un cartel: borrar ésta citando aquella decisión sería dejar a quien
          llega desde una burbuja sin saber por qué faltan gooals. */}
      {filtro && onQuitarFiltro && (
        <div style={{ marginBottom: 10 }}>
          <button
            onClick={onQuitarFiltro}
            aria-label={`Quitar el filtro de ${CATEGORIA_LABEL[filtro]}`}
            className="transition-colors active:bg-[#1E2120]"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              height: 32, padding: '0 10px 0 11px', borderRadius: 16,
              border: `1px solid ${CATEGORIA_COLOR[filtro]}`,
              background: 'transparent', color: '#FFFFFF',
              fontSize: 13, fontWeight: 600,
            }}
          >
            <span
              aria-hidden
              style={{ width: 7, height: 7, borderRadius: '50%', background: CATEGORIA_COLOR[filtro] }}
            />
            {CATEGORIA_LABEL[filtro]}
            <X aria-hidden style={{ width: 14, height: 14, color: '#7A8A85' }} />
          </button>
        </div>
      )}

      <ul
        style={{
          display: 'flex', flexDirection: 'column', gap: 1,
          background: '#2A2E2C', border: '1px solid #2A2E2C', borderRadius: 12, overflow: 'hidden',
        }}
      >
        {lineas.slice(0, visibles).map(linea => (
          <li key={linea.userGooalId} style={{ background: '#161817' }}>
            <button
              onClick={() => onAbrir(linea)}
              className="active:bg-[#1E2120] transition-colors"
              style={{
                width: '100%', minHeight: 44, padding: '11px 12px',
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
              }}
            >
              {/* La barrita comparte color con las pastillas de categoría de
                  arriba: la misma lectura de un vistazo, dos veces. */}
              <span
                aria-hidden
                style={{
                  width: 3, height: 20, borderRadius: 2, flex: '0 0 3px',
                  background: CATEGORIA_COLOR[linea.gooal.categoria],
                }}
              />

              {/* Una sola línea con puntos suspensivos. Que todas midan lo mismo
                  es lo que hace que una lista de 34 se lea de un vistazo. */}
              <span
                style={{
                  flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.3, color: '#FFFFFF',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {linea.gooal.titulo}
              </span>

              {/* Los puntos van SIEMPRE y en su columna. Si en unas líneas
                  hubiera puntos y en otras una cámara, la columna se rompería y
                  la lista dejaría de leerse de un vistazo. */}
              {/* ── RELLENA SI ESTÁ CONSEGUIDO, DE CONTORNO SI NO ──
                  Es la gramática de las burbujas del universo —lleno cuando
                  está hecho, discontinuo cuando no— traída aquí. Pero NO con el
                  color, con la forma, y la diferencia importa:

                  una diferencia de TONO necesita tener al lado con qué
                  compararse, y una de FORMA se entiende sola. Las seis burbujas
                  se ven juntas, así que allí el color basta. Estas dos listas
                  NUNCA comparten pantalla —en «Conseguidos» están todas
                  conseguidas—, así que un gris más claro no diría nada: no hay
                  nada al lado para notar que es más claro. */}
              {linea.fotoVisible && (
                // SVG a mano y no <Camera> de lucide: hace falta rellenar SOLO
                // el objetivo, y el componente solo deja rellenar todo.
                <svg
                  role="img"
                  aria-label={conseguidos ? 'con su foto' : 'con una foto guardada, todavía pendiente'}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#7A8A85"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ width: 13, height: 13, flexShrink: 0, opacity: 0.75 }}
                >
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" fill={conseguidos ? '#7A8A85' : 'none'} />
                </svg>
              )}
              <span style={{ fontSize: 12, fontWeight: 600, color: '#7A8A85', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {linea.puntos} pts
              </span>
            </button>
          </li>
        ))}
      </ul>

      <BotonVerMas total={lineas.length} visibles={visibles} onVerMas={() => setVisibles(v => v + POR_TANDA)} />
    </>
  )
}
