'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map as MapIcon, Newspaper, Compass, User } from 'lucide-react'

export type Tab = 'mapa' | 'explorar' | 'muro' | 'perfil'

/**
 * Alto de la barra, sin el hueco de seguridad del móvil.
 *
 * Vive aquí y se importa: lo tenían escrito a mano AppShell (para reservar el
 * sitio) y el banner de instalar (para colocarse encima). Con tres copias del
 * mismo 56, cambiar la altura dejaba algo descolocado en silencio.
 */
export const ALTO_NAV = 56

/**
 * Lo que ocupa la barra de verdad: los 56 de los botones MÁS su borde superior.
 * Es la medida que hay que usar para reservarle sitio o para colocarse encima:
 * con 56 pelados se queda 1 px por debajo y el borde se solapa.
 */
export const ALTO_NAV_TOTAL = ALTO_NAV + 1

// El mapa va primero: es la pantalla principal. "Mis gooals" ya no existe como
// pestaña; conquistados y pendientes viven en el perfil.
const TABS: { id: Tab; href: string; label: string; Icon: typeof Newspaper }[] = [
  { id: 'mapa', href: '/mapa', label: 'Mapa', Icon: MapIcon },
  { id: 'explorar', href: '/explorar', label: 'Explorar', Icon: Compass },
  { id: 'muro', href: '/muro', label: 'Muro', Icon: Newspaper },
  { id: 'perfil', href: '/perfil', label: 'Perfil', Icon: User },
]

type Props = {
  /** Pestaña activa. Si no se pasa, se deduce de la ruta. */
  activeTab?: Tab
  fotoPerfil?: string | null
}

/** ¿Esta ruta lleva barra inferior? Solo las cuatro pestañas la tienen. */
export function conBarraInferior(ruta: string | null | undefined): boolean {
  return TABS.some(t => ruta?.startsWith(t.href))
}

export default function BottomNav({ activeTab, fotoPerfil }: Props) {
  const pathname = usePathname()
  const actual = activeTab ?? TABS.find(t => pathname.startsWith(t.href))?.id ?? 'mapa'

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 bg-[#0B0B0B] border-t border-[#2A2E2C] flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {TABS.map(({ id, href, label, Icon }) => {
        const activo = actual === id
        return (
          <Link
            key={id}
            href={href}
            aria-current={activo ? 'page' : undefined}
            style={{ height: ALTO_NAV }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 active:bg-[#1E2120] transition-colors ${
              activo ? 'text-[#00D1A7]' : 'text-[#7A8A85]'
            }`}
          >
            {id === 'perfil' && fotoPerfil ? (
              <img
                src={fotoPerfil}
                alt=""
                style={{
                  width: 24, height: 24, borderRadius: '50%', objectFit: 'cover',
                  border: activo ? '1.5px solid #00D1A7' : '1.5px solid transparent',
                }}
              />
            ) : (
              <Icon className="w-6 h-6" strokeWidth={activo ? 2 : 1.5} />
            )}
            <span className="text-[10px] uppercase tracking-wider leading-none whitespace-nowrap">
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
