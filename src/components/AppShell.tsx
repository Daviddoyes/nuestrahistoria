'use client'

import BottomNav, { type Tab } from './BottomNav'

type Props = {
  tab: Tab
  fotoPerfil?: string | null
  /** Cabecera fija bajo la marca (buscador, tabs internos...). No hace scroll. */
  header?: React.ReactNode
  children: React.ReactNode
}

/**
 * Marco común de las 4 pestañas: marca arriba, área de scroll en medio y nav
 * abajo. La altura es 100dvh con el nav descontado por padding, para que el
 * scroll interno no arrastre la página en iOS.
 */
export default function AppShell({ tab, fotoPerfil, header, children }: Props) {
  return (
    <div
      className="flex flex-col bg-[#0A0A0A] overflow-hidden"
      style={{
        height: '100dvh',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="flex-shrink-0 flex items-center justify-center" style={{ height: 36 }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.3em', color: '#1DE9B6', textTransform: 'uppercase' }}>
          GooALS
        </span>
      </div>

      {header && <div className="flex-shrink-0">{header}</div>}

      <div
        className="flex-1 overflow-y-auto"
        style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {children}
      </div>

      <BottomNav activeTab={tab} fotoPerfil={fotoPerfil} />
    </div>
  )
}

/** Spinner a pantalla completa mientras carga una pestaña. */
export function PantallaCargando() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-[#2A2A2A] border-t-[#1DE9B6] rounded-full animate-spin" />
    </div>
  )
}

/** Estado vacío reutilizable: título, texto de apoyo y acción sugerida. */
export function EstadoVacio({
  titulo, texto, accion,
}: { titulo: string; texto?: string; accion?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-8 py-20 text-center">
      <p style={{ fontSize: 15, color: '#666666' }}>{titulo}</p>
      {texto && <p style={{ fontSize: 13, color: '#444444' }}>{texto}</p>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  )
}
