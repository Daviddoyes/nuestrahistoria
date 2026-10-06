'use client'

import { useState } from 'react'
import { Camera } from 'lucide-react'
import { CATEGORIA_COLOR } from '@/lib/gooals'
import type { LineaPerfil } from '@/types/gooals'
import BotonVerMas, { POR_TANDA } from './BotonVerMas'

type Props = {
  lineas: LineaPerfil[]
  onAbrir: (linea: LineaPerfil) => void
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
export default function ListaPerfil({ lineas, onAbrir }: Props) {
  // De 60 en 60: hay perfiles con cientos de líneas.
  const [visibles, setVisibles] = useState(POR_TANDA)

  return (
    <>
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
              {linea.fotoVisible && (
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
