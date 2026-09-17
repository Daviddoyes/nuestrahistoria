import Link from 'next/link'
import { Search } from 'lucide-react'
import { esAdmin } from '@/lib/admin-auth'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { listarUsuarios } from '@/lib/admin-datos'
import BotonAdmin from '@/components/admin/usuarios/BotonAdmin'

export const metadata = { title: 'Usuarios · gooals admin' }

type Props = { searchParams: Promise<{ q?: string | string[]; pagina?: string | string[] }> }

const uno = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor) ?? ''

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Madrid' })

/** "hace 3 días", "hoy"... El último acceso interesa por lo reciente, no por la fecha exacta. */
function haceCuanto(iso: string | null): string {
  if (!iso) return 'Nunca'
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (dias <= 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  if (dias < 30) return `Hace ${dias} días`
  return fecha(iso)
}

/**
 * Pestaña Usuarios. Es la ÚNICA del panel que manda emails al navegador, y solo
 * los 25 de la página que se ve.
 */
export default async function AdminUsuariosPage({ searchParams }: Props) {
  // El layout decide qué se pinta, pero no protege la lectura: esto va antes de tocar la base.
  if (!await esAdmin()) return null

  const params = await searchParams
  const busqueda = uno(params.q).trim().slice(0, 100)
  const paginaPedida = Number.parseInt(uno(params.pagina), 10) || 1

  const supa = await createServerClient()
  const { data: { user } } = await supa.auth.getUser()

  let datos
  try {
    datos = await listarUsuarios({ busqueda, pagina: paginaPedida })
  } catch (e) {
    console.error('[admin/usuarios]', e)
    return (
      <p role="alert" style={{ fontSize: 14, color: '#FF5252', background: 'rgba(255,82,82,0.12)', borderRadius: 12, padding: '12px 14px' }}>
        No se pudieron cargar los usuarios. Recarga la página para intentarlo de nuevo.
      </p>
    )
  }

  const enlace = (pagina: number) => {
    const p = new URLSearchParams()
    if (busqueda) p.set('q', busqueda)
    if (pagina > 1) p.set('pagina', String(pagina))
    const qs = p.toString()
    return `/admin/usuarios${qs ? `?${qs}` : ''}`
  }

  const celda: React.CSSProperties = { padding: '10px 12px', borderTop: '1px solid #1E2120', whiteSpace: 'nowrap', verticalAlign: 'middle' }
  const botonPagina: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', minHeight: 40, padding: '0 14px', borderRadius: 8, border: '1px solid #2A2E2C', color: '#FFFFFF', fontSize: 13, textDecoration: 'none' }

  return (
    <div>
      {/* Formulario GET: la búsqueda queda en la dirección y se puede recargar o compartir. */}
      <form action="/admin/usuarios" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search aria-hidden style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#7A8A85' }} />
          <input
            type="search"
            name="q"
            defaultValue={busqueda}
            placeholder="Nombre, @usuario o email"
            aria-label="Buscar usuarios"
            style={{ width: '100%', minHeight: 42, padding: '0 12px 0 36px', borderRadius: 10, border: '1px solid #2A2E2C', background: '#1E2120', color: '#FFFFFF', fontSize: 14 }}
          />
        </div>
        <button type="submit" style={{ minHeight: 42, padding: '0 16px', borderRadius: 10, border: 'none', background: '#00D1A7', color: '#0B0B0B', fontSize: 13, fontWeight: 600 }}>
          Buscar
        </button>
        {busqueda && (
          <Link href="/admin/usuarios" style={{ fontSize: 13, color: '#7A8A85', minHeight: 42, display: 'inline-flex', alignItems: 'center', padding: '0 6px' }}>
            Quitar búsqueda
          </Link>
        )}
      </form>

      <p aria-live="polite" style={{ fontSize: 13, color: '#A3B1AC', marginTop: 12 }}>
        <strong style={{ color: '#00D1A7' }}>{datos.total.toLocaleString('es-ES')}</strong>{' '}
        {datos.total === 1 ? 'usuario' : 'usuarios'}{busqueda && <> con «{busqueda}»</>}
      </p>

      {datos.usuarios.length === 0 ? (
        <p style={{ fontSize: 14, color: '#7A8A85', textAlign: 'center', padding: '28px 0' }}>
          {busqueda ? 'Nadie coincide con esa búsqueda.' : 'Todavía no hay usuarios.'}
        </p>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: 10, border: '1px solid #2A2E2C', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 860 }}>
            <thead>
              <tr style={{ background: '#161817', color: '#7A8A85', textAlign: 'left' }}>
                {['Nombre', '@usuario', 'Email', 'Alta', 'Último acceso', 'Completados', 'Puntos', 'Admin'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datos.usuarios.map(u => (
                <tr key={u.id}>
                  <td style={{ ...celda, color: '#FFFFFF' }}>{u.nombre || <span style={{ color: '#7A8A85' }}>Sin perfil</span>}</td>
                  <td style={{ ...celda, color: '#A3B1AC' }}>{u.username ? `@${u.username}` : '—'}</td>
                  <td style={{ ...celda, color: '#A3B1AC' }}>{u.email || '—'}</td>
                  <td style={{ ...celda, color: '#A3B1AC' }}>{fecha(u.alta)}</td>
                  <td style={{ ...celda, color: u.ultimoAcceso ? '#A3B1AC' : '#7A8A85' }} title={u.ultimoAcceso ? fecha(u.ultimoAcceso) : undefined}>
                    {haceCuanto(u.ultimoAcceso)}
                  </td>
                  <td style={{ ...celda, color: '#FFFFFF', textAlign: 'right' }}>{u.completados.toLocaleString('es-ES')}</td>
                  <td style={{ ...celda, color: '#00D1A7', fontWeight: 600, textAlign: 'right' }}>{u.puntos.toLocaleString('es-ES')}</td>
                  <td style={celda}>
                    <BotonAdmin userId={u.id} nombre={u.nombre || u.email || 'Esta cuenta'} esAdmin={u.esAdmin} esUnoMismo={u.id === user?.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {datos.totalPaginas > 1 && (
        <nav aria-label="Páginas" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14 }}>
          {datos.pagina > 1
            ? <Link href={enlace(datos.pagina - 1)} style={botonPagina}>Anterior</Link>
            : <span style={{ ...botonPagina, opacity: 0.4 }}>Anterior</span>}
          <span style={{ fontSize: 13, color: '#A3B1AC' }}>Página {datos.pagina} de {datos.totalPaginas}</span>
          {datos.pagina < datos.totalPaginas
            ? <Link href={enlace(datos.pagina + 1)} style={botonPagina}>Siguiente</Link>
            : <span style={{ ...botonPagina, opacity: 0.4 }}>Siguiente</span>}
        </nav>
      )}
    </div>
  )
}
