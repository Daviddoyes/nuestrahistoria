'use client'

import { ListTodo, BookImage } from 'lucide-react'

type Tab = 'planes' | 'historias'

type Props = {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export default function BottomNav({ activeTab, onTabChange }: Props) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 bg-[#0A0A0A] border-t border-[#1A1A1A] flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <button
        onClick={() => onTabChange('planes')}
        style={{ height: 56 }}
        className={`flex-1 flex flex-col items-center justify-center gap-1 active:bg-[#141414] transition-colors ${
          activeTab === 'planes' ? 'text-[#E8692A]' : 'text-[#444444]'
        }`}
      >
        <ListTodo className="w-6 h-6" strokeWidth={activeTab === 'planes' ? 2 : 1.5} />
        <span className="text-[10px] uppercase tracking-wider leading-none">Planes</span>
      </button>

      <button
        onClick={() => onTabChange('historias')}
        style={{ height: 56 }}
        className={`flex-1 flex flex-col items-center justify-center gap-1 active:bg-[#141414] transition-colors ${
          activeTab === 'historias' ? 'text-[#E8692A]' : 'text-[#444444]'
        }`}
      >
        <BookImage className="w-6 h-6" strokeWidth={activeTab === 'historias' ? 2 : 1.5} />
        <span className="text-[10px] uppercase tracking-wider leading-none">Historias</span>
      </button>
    </nav>
  )
}
