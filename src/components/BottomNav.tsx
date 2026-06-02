'use client'

import { ListTodo, BookOpen } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import type { Profile } from '@/types/planes'

type Tab = 'pendientes' | 'historias'

type Props = {
  activeTab?: Tab
  onTabChange?: (tab: Tab) => void
  pendientesCount?: number
  historiasCount?: number
  profile?: Profile | null
}

export default function BottomNav({
  activeTab,
  onTabChange,
  pendientesCount = 0,
  historiasCount = 0,
  profile,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const isOnPerfil = pathname === '/perfil'

  const initial = profile?.nombre ? profile.nombre[0].toUpperCase() : '?'
  const hasFoto = !!profile?.foto_perfil_url

  const planesActive = !isOnPerfil && activeTab === 'pendientes'
  const historiasActive = !isOnPerfil && activeTab === 'historias'

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-[#2A2A2A] z-20"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex h-14">
        {/* Planes */}
        <button
          onClick={() => {
            if (isOnPerfil) { router.push('/planes') } else { onTabChange?.('pendientes') }
          }}
          className={`flex-1 flex flex-col items-center justify-center gap-1 active:bg-[#141414] transition-colors ${
            planesActive ? 'text-[#E8692A]' : 'text-[#333333]'
          }`}
        >
          <ListTodo className="w-6 h-6" strokeWidth={planesActive ? 2 : 1.5} />
          <span className="text-[10px] font-medium leading-none uppercase tracking-[0.08em]">
            Planes{planesActive && pendientesCount > 0 ? ` · ${pendientesCount}` : ''}
          </span>
        </button>

        {/* Historias */}
        <button
          onClick={() => {
            if (isOnPerfil) { router.push('/planes') } else { onTabChange?.('historias') }
          }}
          className={`flex-1 flex flex-col items-center justify-center gap-1 active:bg-[#141414] transition-colors ${
            historiasActive ? 'text-[#E8692A]' : 'text-[#333333]'
          }`}
        >
          <BookOpen className="w-6 h-6" strokeWidth={historiasActive ? 2 : 1.5} />
          <span className="text-[10px] font-medium leading-none uppercase tracking-[0.08em]">
            Historias{historiasActive && historiasCount > 0 ? ` · ${historiasCount}` : ''}
          </span>
        </button>

        {/* Perfil */}
        <button
          onClick={() => { if (!isOnPerfil) router.push('/perfil') }}
          className={`flex-1 flex flex-col items-center justify-center gap-1 active:bg-[#141414] transition-colors ${
            isOnPerfil ? 'text-[#E8692A]' : 'text-[#333333]'
          }`}
        >
          {hasFoto ? (
            <img
              src={profile!.foto_perfil_url!}
              alt=""
              className="w-6 h-6 rounded-full object-cover"
              style={{ border: isOnPerfil ? '1.5px solid #E8692A' : '1.5px solid #2A2A2A' }}
            />
          ) : (
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isOnPerfil ? 'bg-[#E8692A] text-white' : 'bg-[#2A2A2A] text-[#666666]'
              }`}
            >
              {initial}
            </div>
          )}
          <span className="text-[10px] font-medium leading-none uppercase tracking-[0.08em]">
            Perfil
          </span>
        </button>
      </div>
    </nav>
  )
}
