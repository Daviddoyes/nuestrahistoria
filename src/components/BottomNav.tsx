'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, User } from 'lucide-react'

/**
 * Las pestañas posibles.
 *
 * 'muro' y 'perfil' siguen aquí aunque ya no estén en la barra: son pantallas
 * de verdad, llevan AppShell y tienen que poder decir bajo cuál de las dos
 * pestañas se las está mirando.
 */
export type Tab = 'inicio' | 'explorar' | 'muro' | 'perfil'

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

/**
 * DOS pestañas, decidido el 9-10-2026. Antes eran cuatro.
 *
 * "Tú" es la entrada y sigue viviendo en /inicio. La dirección NO se cambió a
 * propósito: el start_url del manifest apunta ahí, y moverla habría dejado
 * apuntando a un sitio viejo a todo el que ya tiene la app instalada, hasta que
 * su móvil refresque el manifest. En una app instalada la dirección no la ve
 * nadie; lo que ve la gente es qué sale al abrir.
 *
 * "Buscar" es /explorar, que ya traía dentro Lista, Mapa y Descubrir.
 *
 * Y las dos que se fueron, cada una por su razón:
 *
 * · PERFIL no hace falta como pestaña, porque "Tú" ES tu perfil. En /perfil
 *   quedan tus dos listas enteras, y se llega desde "Ver los N pendientes".
 * · MURO se va porque con la base casi sin seguimientos **está vacío para todo
 *   el mundo el primer día**, y una pestaña siempre vacía enseña a no tocarla.
 *   No desaparece: se llega desde la línea social de Tú, que solo aparece
 *   cuando hay algo que contar. No se quita, se gana la puerta.
 */
const TABS: { id: Tab; href: string; label: string; Icon: typeof User }[] = [
  { id: 'inicio', href: '/inicio', label: 'Tú', Icon: User },
  { id: 'explorar', href: '/explorar', label: 'Buscar', Icon: Search },
]

type Props = {
  /** Pestaña activa. Si no se pasa, se deduce de la ruta. */
  activeTab?: Tab
  fotoPerfil?: string | null
}

/**
 * ¿Esta ruta lleva barra inferior?
 *
 * No vale mirar TABS: /muro y /perfil ya no son pestañas pero siguen llevando
 * barra, porque son pantallas enteras y quitársela dejaría a alguien dentro sin
 * forma de volver.
 */
const CON_BARRA = ['/inicio', '/explorar', '/muro', '/perfil']
export function conBarraInferior(ruta: string | null | undefined): boolean {
  return CON_BARRA.some(r => ruta?.startsWith(r))
}

export default function BottomNav({ activeTab, fotoPerfil }: Props) {
  const pathname = usePathname()
  const actual = activeTab ?? TABS.find(t => pathname.startsWith(t.href))?.id ?? 'inicio'
  // /perfil y /muro cuelgan de "Tú": es desde donde se llega a los dos.
  const encendida = actual === 'perfil' || actual === 'muro' ? 'inicio' : actual

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 bg-[#0B0B0B] border-t border-[#2A2E2C] flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {TABS.map(({ id, href, label, Icon }) => {
        const activo = encendida === id
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
