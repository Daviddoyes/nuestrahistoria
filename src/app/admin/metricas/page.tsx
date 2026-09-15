import { esAdmin } from '@/lib/admin-auth'
import { leerMetricas } from '@/lib/admin-datos'
import { CATEGORIA_COLOR, CATEGORIA_LABEL } from '@/lib/gooals'
import IconoCategoria from '@/components/IconoCategoria'

export const metadata = { title: 'Métricas · GooALS Admin' }

const numero = (n: number) => n.toLocaleString('es-ES')
const porcentaje = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0)

const tarjeta: React.CSSProperties = { background: '#161817', border: '1px solid #2A2E2C', borderRadius: 12, padding: 16 }
const tituloSeccion: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#7A8A85', marginBottom: 12 }

function Cifra({ valor, etiqueta, detalle }: { valor: number; etiqueta: string; detalle?: string }) {
  return (
    <div style={tarjeta}>
      <p className="fuente-titular" style={{ fontSize: 28, fontWeight: 700, color: '#00D1A7', lineHeight: 1 }}>{numero(valor)}</p>
      <p style={{ fontSize: 12, color: '#A3B1AC', marginTop: 6 }}>{etiqueta}</p>
      {detalle && <p style={{ fontSize: 11, color: '#7A8A85', marginTop: 2 }}>{detalle}</p>}
    </div>
  )
}

function Barra({ etiqueta, valor, maximo, color = '#00D1A7', icono }: { etiqueta: React.ReactNode; valor: number; maximo: number; color?: string; icono?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#A3B1AC', width: 150, flexShrink: 0, minWidth: 0 }}>
        {icono}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{etiqueta}</span>
      </span>
      <div style={{ flex: 1, height: 16, background: '#1E2120', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${maximo > 0 ? (valor / maximo) * 100 : 0}%`, background: color, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF', width: 36, textAlign: 'right', flexShrink: 0 }}>{numero(valor)}</span>
    </div>
  )
}

/**
 * Pestaña Métricas. Todo agregado: ni emails ni nombres de usuarios. Se calcula
 * al abrir la pestaña y solo entonces; abrir Gooals ya no descarga nada de esto.
 */
export default async function AdminMetricasPage() {
  // El layout decide qué se pinta, pero no protege la lectura: esto va antes de tocar la base.
  if (!await esAdmin()) return null

  let m
  try {
    m = await leerMetricas()
  } catch (e) {
    console.error('[admin/metricas]', e)
    return (
      <p role="alert" style={{ fontSize: 14, color: '#FF5252', background: 'rgba(255,82,82,0.12)', borderRadius: 12, padding: '12px 14px' }}>
        No se pudieron calcular las métricas. Recarga la página para intentarlo de nuevo.
      </p>
    )
  }

  const maxSemana = Math.max(...m.altasPorSemana.map(s => s.altas), 1)
  const maxCategoria = Math.max(...m.porCategoria.map(c => c.completados), 1)
  const fechaCorta = (dia: string) => new Date(`${dia}T12:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <section>
        <p style={tituloSeccion}>Usuarios y actividad</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <Cifra valor={m.usuarios.total} etiqueta="Usuarios" />
          <Cifra valor={m.usuarios.onboarding} etiqueta="Terminaron el onboarding" detalle={`${porcentaje(m.usuarios.onboarding, m.usuarios.total)}% del total`} />
          <Cifra valor={m.completados.total} etiqueta="Gooals completados" />
          <Cifra valor={m.completados.ultimos30Dias} etiqueta="Completados en 30 días" />
        </div>
      </section>

      <section>
        <p style={tituloSeccion}>Altas por semana · últimas 12</p>
        <div style={{ ...tarjeta, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {m.altasPorSemana.map((s, i) => (
            <Barra
              key={s.lunes}
              etiqueta={i === m.altasPorSemana.length - 1 ? `Esta semana` : `Semana del ${fechaCorta(s.lunes)}`}
              valor={s.altas}
              maximo={maxSemana}
            />
          ))}
        </div>
      </section>

      <section>
        <p style={tituloSeccion}>Completados por categoría</p>
        <div style={{ ...tarjeta, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {m.porCategoria.map(c => (
            <Barra
              key={c.categoria}
              etiqueta={CATEGORIA_LABEL[c.categoria]}
              icono={<IconoCategoria categoria={c.categoria} tamano={14} color={CATEGORIA_COLOR[c.categoria]} />}
              valor={c.completados}
              maximo={maxCategoria}
              color={CATEGORIA_COLOR[c.categoria]}
            />
          ))}
        </div>
      </section>

      <section>
        <p style={tituloSeccion}>Los 20 gooals más conquistados</p>
        {m.masConquistados.length === 0 ? (
          <p style={{ ...tarjeta, fontSize: 13, color: '#7A8A85' }}>Todavía nadie ha completado ningún gooal.</p>
        ) : (
          <ol style={{ ...tarjeta, display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 16 }}>
            {m.masConquistados.map((g, i) => (
              <li key={g.id} style={{ listStyle: 'none', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                <span style={{ width: 22, color: '#7A8A85', textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                <IconoCategoria categoria={g.categoria} tamano={14} color={CATEGORIA_COLOR[g.categoria]} />
                <span style={{ flex: 1, minWidth: 0, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.titulo}</span>
                <span style={{ fontWeight: 600, color: '#00D1A7', flexShrink: 0 }}>{numero(g.conquistados)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <p style={tituloSeccion}>Estado del catálogo</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <Cifra valor={m.catalogo.verificados} etiqueta="Verificados" detalle={`${porcentaje(m.catalogo.verificados, m.catalogo.total)}% de ${numero(m.catalogo.total)}`} />
          <Cifra valor={m.catalogo.borradores} etiqueta="En borrador" detalle="No se ven en la app" />
          <Cifra valor={m.catalogo.dudosos} etiqueta="Categoría dudosa" detalle="Por repasar en Gooals" />
        </div>
      </section>
    </div>
  )
}
