import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { esAdmin } from '@/lib/admin-auth'
import PestanasAdmin from '@/components/admin/PestanasAdmin'

export const metadata = { title: 'GooALS Admin' }

/**
 * Marco del panel: comprueba el permiso y pinta las cuatro pestañas.
 *
 * Esta comprobación decide qué se PINTA, nada más. Un layout no se vuelve a
 * ejecutar al cambiar de pestaña, y las rutas de /api/admin y las Server Actions
 * se pueden llamar sin pasar por aquí. Por eso cada página que lee datos, cada
 * ruta y cada acción vuelven a llamar a esAdmin() por su cuenta.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!await esAdmin()) {
    return (
      <main style={{ minHeight: '100dvh', background: '#0B0B0B', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingInline: 24 }}>
        <div style={{ width: '100%', maxWidth: 340, textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.25em', color: '#00D1A7', textTransform: 'uppercase', marginBottom: 8 }}>
            GooALS ADMIN
          </p>
          <div style={{ width: 40, height: 1, background: '#00D1A7', margin: '0 auto 28px' }} />
          <p style={{ fontSize: 15, color: '#A3B1AC', lineHeight: 1.6, marginBottom: 10 }}>
            Esta cuenta no tiene acceso al panel.
          </p>
          <p style={{ fontSize: 13, color: '#7A8A85', lineHeight: 1.6 }}>
            Inicia sesión con una cuenta de administrador. Los permisos se dan
            desde Supabase, en la columna <code>es_admin</code> de <code>profiles</code>.
          </p>
          <Link
            href="/"
            style={{ display: 'inline-block', marginTop: 24, padding: '12px 22px', borderRadius: 12, background: '#00D1A7', color: '#0B0B0B', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}
          >
            Ir al inicio
          </Link>
        </div>
      </main>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0B0B0B', color: '#FFFFFF' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: '#0B0B0B', borderBottom: '1px solid #2A2E2C' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', paddingInline: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 48 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.25em', color: '#00D1A7', textTransform: 'uppercase' }}>
            GooALS ADMIN
          </p>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#7A8A85', textDecoration: 'none', minHeight: 40 }}>
            <ArrowLeft style={{ width: 13, height: 13 }} /> Volver a la app
          </Link>
        </div>
        <PestanasAdmin />
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', paddingInline: 16, paddingBlock: '20px 60px' }}>
        {children}
      </div>
    </div>
  )
}
