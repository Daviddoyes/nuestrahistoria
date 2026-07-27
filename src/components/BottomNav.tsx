'use client'

import { ListTodo, BookImage, Compass, UserCircle } from 'lucide-react'

type Tab = 'planes' | 'historias' | 'explorar' | 'perfil'

type Props = {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  fotoPerfil?: string | null
}

const TABS: { id: Tab; label: string; Icon: typeof ListTodo }[] = [
  { id: 'planes', label: 'Planes', Icon: ListTodo },
  { id: 'historias', label: 'Historias', Icon: BookImage },
  { id: 'explorar', label: 'Explorar', Icon: Compass },
  { id: 'perfil', label: 'Perfil', Icon: UserCircle },
]

export default function BottomNav({ activeTab, onTabChange, fotoPerfil }: Props) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 bg-[#0A0A0A] border-t border-[#1A1A1A] flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const activo = activeTab === id
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            style={{ height: 56 }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 active:bg-[#141414] transition-colors ${
              activo ? 'text-[#1DE9B6]' : 'text-[#444444]'
            }`}
          >
            {id === 'perfil' && fotoPerfil ? (
              <img
                src={fotoPerfil}
                alt=""
                style={{
                  width: 24, height: 24, borderRadius: '50%', objectFit: 'cover',
                  border: activo ? '1.5px solid #1DE9B6' : '1.5px solid transparent',
                }}
              />
            ) : (
              <Icon className="w-6 h-6" strokeWidth={activo ? 2 : 1.5} />
            )}
            <span className="text-[10px] uppercase tracking-wider leading-none">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
