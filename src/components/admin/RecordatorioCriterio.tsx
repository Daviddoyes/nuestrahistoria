'use client'

import { PRINCIPIO_GOOAL, REGLAS_GOOAL } from '@/lib/criterio-gooals'

type Props = {
  /** Plegado de serie donde ya se conoce el criterio (la lista de trabajo). */
  plegado?: boolean
}

/**
 * Las cinco reglas del catálogo, a la vista al crear o corregir un gooal.
 *
 * Es un recordatorio, NO un validador: el criterio lo pone David. Un validador
 * automático rechazaría títulos buenos por una coma y dejaría pasar los malos,
 * que casi siempre lo son por el sentido, no por la forma.
 */
export default function RecordatorioCriterio({ plegado = false }: Props) {
  return (
    <details
      open={!plegado}
      style={{ background: '#161817', border: '1px solid #2A2E2C', borderRadius: 12, padding: '10px 14px' }}
    >
      <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#00D1A7', minHeight: 32, display: 'flex', alignItems: 'center' }}>
        Las cinco reglas de un gooal
      </summary>

      <ol style={{ margin: '8px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {REGLAS_GOOAL.map((r, i) => (
          <li key={r.titulo} style={{ listStyle: 'none', fontSize: 12, lineHeight: 1.5, color: '#A3B1AC' }}>
            <strong style={{ color: '#FFFFFF' }}>{i + 1}. {r.titulo}.</strong> {r.regla}
            <br />
            <span style={{ color: '#FF5252' }}>MAL:</span> «{r.mal}» ·{' '}
            <span style={{ color: '#00D1A7' }}>BIEN:</span> «{r.bien}»
            {r.matiz && (
              <span style={{ display: 'block', color: '#7A8A85', marginTop: 3 }}>{r.matiz}</span>
            )}
          </li>
        ))}
      </ol>

      <p style={{ fontSize: 12, lineHeight: 1.5, color: '#FFD54F', marginTop: 10 }}>{PRINCIPIO_GOOAL}</p>
    </details>
  )
}
