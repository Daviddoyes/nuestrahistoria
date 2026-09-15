'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChartColumn, Library, Mail, Users } from 'lucide-react'

const PESTANAS = [
  { href: '/admin/gooals', label: 'Gooals', Icono: Library },
  { href: '/admin/usuarios', label: 'Usuarios', Icono: Users },
  { href: '/admin/metricas', label: 'Métricas', Icono: ChartColumn },
  { href: '/admin/comunicaciones', label: 'Comunicaciones', Icono: Mail },
] as const

/** Las cuatro pestañas del panel. Es de cliente solo para saber cuál está activa. */
export default function PestanasAdmin() {
  const ruta = usePathname()
  return (
    // Con cuatro pestañas en un móvil estrecho, se desliza en horizontal en vez de partirse en dos líneas.
    <nav aria-label="Secciones del panel" style={{ overflowX: 'auto' }}>
      <ul style={{ maxWidth: 1100, margin: '0 auto', paddingInline: 8, display: 'flex', gap: 4 }}>
        {PESTANAS.map(({ href, label, Icono }) => {
          // /admin/gooals/importar sigue siendo la pestaña Gooals.
          const activa = ruta === href || ruta.startsWith(`${href}/`)
          return (
            <li key={href} style={{ listStyle: 'none', flexShrink: 0 }}>
              <Link
                href={href}
                aria-current={activa ? 'page' : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, padding: '0 12px',
                  fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
                  color: activa ? '#00D1A7' : '#7A8A85',
                  borderBottom: `2px solid ${activa ? '#00D1A7' : 'transparent'}`,
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                <Icono style={{ width: 15, height: 15 }} /> {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
