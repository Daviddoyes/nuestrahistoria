'use client'

import { CATEGORIA_COLOR, CATEGORIA_GRADIENTE } from '@/lib/gooals'
import { FotoPrivada } from '@/components/FotosPrivadas'
import type { EnComun } from '@/types/gooals'

type Props = {
  enComun: EnComun
  onVerPendientes: () => void
}

/**
 * Lo que os une: lo primero que se ve de otra persona.
 *
 * Las miniaturas son de SU prueba (lo que ves de ella); si ese gooal suyo no
 * tiene foto, el degradado de la categoría — desde que se puede conseguir sin
 * foto, eso pasa a menudo.
 *
 * PENDIENTE: cuando las fotos de la gente pasen a ser privadas, esta tarjeta
 * deja de poder enseñarlas y pasará a enseñar la foto del GOOAL, que ahora
 * tenemos en el catálogo. Encaja mejor incluso: lo que tenéis en común es el
 * gooal, no su foto.
 */
export default function TarjetaEnComun({ enComun, onVerPendientes }: Props) {
  const { totalConseguidos, conseguidos, totalPendientes, pendientes } = enComun
  const restoFotos = totalConseguidos - conseguidos.length
  const restoTitulos = totalPendientes - pendientes.length

  return (
    <section
      aria-label="Lo que tenéis en común"
      style={{
        border: '1px solid rgba(0,209,167,0.28)', background: 'rgba(0,209,167,0.05)',
        borderRadius: 16, padding: 16,
      }}
    >
      {totalConseguidos === 0 && totalPendientes === 0 && (
        <p style={{ fontSize: 14, color: '#A3B1AC', textAlign: 'center', padding: '6px 0' }}>
          Aún no tenéis gooals en común
        </p>
      )}

      {totalConseguidos > 0 && (
        <>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2 }}>
            <span className="fuente-titular" style={{ fontWeight: 800 }}>{totalConseguidos}</span>{' '}
            {totalConseguidos === 1 ? 'gooal en común' : 'gooals en común'}
          </p>
          <p style={{ fontSize: 12, color: '#A3B1AC', marginTop: 2 }}>
            {totalConseguidos === 1 ? 'Lo habéis conseguido los dos' : 'Los habéis conseguido los dos'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginTop: 12 }}>
            {conseguidos.map(c => (
              <div
                key={c.userGooalId}
                title={c.gooal.titulo}
                style={{
                  aspectRatio: '1 / 1', borderRadius: 8, overflow: 'hidden',
                  background: CATEGORIA_GRADIENTE[c.gooal.categoria],
                }}
              >
                {c.foto_url && (
                  <FotoPrivada
                    userGooalId={c.userGooalId}
                    alt={c.gooal.titulo}
                    style={{ width: '100%', height: '100%' }}
                  />
                )}
              </div>
            ))}
            {restoFotos > 0 && (
              <div
                aria-label={`y ${restoFotos} más`}
                style={{
                  aspectRatio: '1 / 1', borderRadius: 8, background: '#1E2120',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 600, color: '#A3B1AC',
                }}
              >
                +{restoFotos}
              </div>
            )}
          </div>
        </>
      )}

      {totalConseguidos > 0 && totalPendientes > 0 && (
        <div style={{ height: 1, background: '#2A2E2C', margin: '14px 0' }} />
      )}

      {totalPendientes > 0 && (
        <>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#00D1A7' }}>
            {totalPendientes} {totalPendientes === 1 ? 'pendiente en común' : 'pendientes en común'}
          </p>
          <ul style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pendientes.map(g => (
              <li key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#FFFFFF', minWidth: 0 }}>
                <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: CATEGORIA_COLOR[g.categoria], flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.titulo}</span>
              </li>
            ))}
          </ul>
          {restoTitulos > 0 && (
            <button
              onClick={onVerPendientes}
              className="active:opacity-60 transition-opacity"
              style={{ fontSize: 13, fontWeight: 600, color: '#00D1A7', minHeight: 44, padding: 0, marginBottom: -10 }}
            >
              y {restoTitulos} más
            </button>
          )}
        </>
      )}
    </section>
  )
}
