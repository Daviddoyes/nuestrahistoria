'use client'

import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { CATEGORIA_GRADIENTE, DIFICULTAD_META } from '@/lib/gooals'
import type { GooalResumen, Pendiente } from '@/types/gooals'
import BotonVerMas, { POR_TANDA } from './BotonVerMas'

type Props = {
  pendientes: Pendiente[]
  /** Solo en el perfil propio. Sin él, la lista es de solo lectura. */
  onYaLoHice?: (gooal: GooalResumen) => void
}

const pastilla: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, lineHeight: 1,
  padding: '4px 8px', borderRadius: 999, background: '#1E2120', whiteSpace: 'nowrap',
}

/** Lista de pendientes. Filas y no rejilla: un pendiente todavía no tiene foto. */
export default function ListaPendientes({ pendientes, onYaLoHice }: Props) {
  const [visibles, setVisibles] = useState(POR_TANDA)

  return (
    <>
      <ul style={{ display: 'flex', flexDirection: 'column' }}>
        {pendientes.slice(0, visibles).map(({ userGooalId, gooal }) => {
          const dificultad = DIFICULTAD_META[gooal.dificultad]
          return (
            <li
              key={userGooalId}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #2A2E2C' }}
            >
              <span
                aria-hidden
                style={{ width: 54, height: 54, borderRadius: 10, flexShrink: 0, background: CATEGORIA_GRADIENTE[gooal.categoria] }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 14, fontWeight: 600, color: '#FFFFFF', lineHeight: 1.3,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  } as React.CSSProperties}
                >
                  {gooal.titulo}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                  {dificultad && (
                    <span style={{ ...pastilla, color: dificultad.color }}>
                      {dificultad.emoji} {dificultad.label}
                    </span>
                  )}
                  <span style={{ ...pastilla, color: '#00D1A7', fontWeight: 600 }}>+{gooal.puntos} pts</span>
                  {gooal.ciudad && (
                    <span style={{ ...pastilla, color: '#A3B1AC', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <MapPin aria-hidden className="w-3 h-3" style={{ flexShrink: 0 }} /> {gooal.ciudad}
                    </span>
                  )}
                </div>
              </div>

              {onYaLoHice && (
                <button
                  onClick={() => onYaLoHice(gooal)}
                  className="active:bg-[rgba(0,209,167,0.14)] transition-colors"
                  style={{
                    height: 44, padding: '0 12px', borderRadius: 12, flexShrink: 0,
                    border: '1px solid #00D1A7', color: '#00D1A7', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                  }}
                >
                  Ya lo hice
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <BotonVerMas total={pendientes.length} visibles={visibles} onVerMas={() => setVisibles(v => v + POR_TANDA)} />
    </>
  )
}
