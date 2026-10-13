'use client'

import { useState } from 'react'
import { Camera, X } from 'lucide-react'
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

              {/* ── HASTA DOS LÍNEAS ───────────────────────────
                  Era UNA sola con puntos suspensivos, y la razón era buena: que
                  todas midan lo mismo es lo que hace que una lista de 34 se lea
                  de un vistazo.

                  Pierde contra algo más fuerte. En un móvil de 375 caben unos
                  33 caracteres y hay títulos de 57, así que se cortaban tres de
                  cada siete — y en esta lista EL TÍTULO ES LO ÚNICO QUE HAY.
                  Una lista cuyo único contenido está cortado no se lee de un
                  vistazo: se lee a medias.

                  Dos líneas y no más: con tres, una lista larga deja de tener
                  forma. Lo que sigue alineado en todas las filas es la barrita
                  de color y la columna de puntos, que es lo que de verdad
                  sostiene el vistazo. */}
              <span
                style={{
                  flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.3, color: '#FFFFFF',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                } as React.CSSProperties}
              >
                {linea.gooal.titulo}
              </span>

              {/* Los puntos van SIEMPRE y en su columna. Si en unas líneas
                  hubiera puntos y en otras una cámara, la columna se rompería y
                  la lista dejaría de leerse de un vistazo. */}
              {/* ── SOLO EN CONSEGUIDOS ───────────────────────────
                  Hubo un intento de marcar también los pendientes con foto —se
                  puede tener una desde que se puede desmarcar—, primero con la
                  cámara entera rellena y luego con solo el objetivo. Se miraron
                  las dos a tamaño real en una hoja de pruebas:

                  · la cámara entera rellena deja de parecer una cámara a 13 px:
                    es una mancha. Para marcar el estado nuevo estropeaba el que
                    ya funcionaba, que es el cambio que no hay que hacer.
                  · y entre el objetivo relleno y el contorno NO HAY DIFERENCIA
                    VISIBLE a ese tamaño. Un icono que nadie distingue parece
                    información y no lo es.

                  Así que en los pendientes no va nada, y en conseguidos se queda
                  exactamente como estaba. Quien tenga una foto en un pendiente la
                  ve y la borra en la ficha, que es donde hay sitio para decirlo
                  con palabras: esa tira es la red de seguridad, y el icono solo
                  avisaba antes. */}
              {conseguidos && linea.fotoVisible && (
                <Camera
                  aria-label="con su foto"
                  style={{ width: 13, height: 13, flexShrink: 0, color: '#7A8A85', opacity: 0.75 }}
                />
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
