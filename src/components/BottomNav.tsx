'use client'

import { ListTodo, Compass, BookImage } from 'lucide-react'

type Tab = 'planes' | 'explorar' | 'historias'

type Props = {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string; Icon: typeof ListTodo }[] = [
  { id: 'planes', label: 'Planes', Icon: ListTodo },
  { id: 'explorar', label: 'Explorar', Icon: Compass },
  { id: 'historias', label: 'Historias', Icon: BookImage },
]

export default function BottomNav({ activeTab, onTabChange }: Props) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 bg-[#0A0A0A] border-t border-[#1A1A1A] flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          style={{ height: 56 }}
          className={`flex-1 flex flex-col items-center justify-center gap-1 active:bg-[#141414] transition-colors ${
            activeTab === id ? 'text-[#E8692A]' : 'text-[#444444]'
          }`}
        >
          <Icon className="w-6 h-6" strokeWidth={activeTab === id ? 2 : 1.5} />
          <span className="text-[10px] uppercase tracking-wider leading-none">{label}</span>
        </button>
      ))}
    </nav>
  )
}
