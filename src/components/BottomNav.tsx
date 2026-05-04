'use client'

import { ListTodo, BookOpen } from 'lucide-react'

type Tab = 'pendientes' | 'historias'

type Props = {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  pendientesCount: number
  historiasCount: number
}

export default function BottomNav({
  activeTab,
  onTabChange,
  pendientesCount,
  historiasCount,
}: Props) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-[#2A2A2A] z-20"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex h-14">
        <button
          onClick={() => onTabChange('pendientes')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 active:bg-[#141414] transition-colors ${
            activeTab === 'pendientes' ? 'text-[#E8E0D0]' : 'text-[#333333]'
          }`}
        >
          <ListTodo className="w-6 h-6" strokeWidth={activeTab === 'pendientes' ? 2 : 1.5} />
          <span className="text-[10px] font-medium leading-none uppercase tracking-[0.08em]">
            Planes{pendientesCount > 0 ? ` · ${pendientesCount}` : ''}
          </span>
        </button>

        <button
          onClick={() => onTabChange('historias')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 active:bg-[#141414] transition-colors ${
            activeTab === 'historias' ? 'text-[#E8E0D0]' : 'text-[#333333]'
          }`}
        >
          <BookOpen className="w-6 h-6" strokeWidth={activeTab === 'historias' ? 2 : 1.5} />
          <span className="text-[10px] font-medium leading-none uppercase tracking-[0.08em]">
            Historias{historiasCount > 0 ? ` · ${historiasCount}` : ''}
          </span>
        </button>
      </div>
    </nav>
  )
}
