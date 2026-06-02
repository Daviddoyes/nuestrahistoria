'use client'

import { ListTodo } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import type { Profile } from '@/types/planes'

type Props = {
  profile?: Profile | null
}

export default function BottomNav({ profile }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const isOnPerfil = pathname === '/perfil'

  const initial = profile?.nombre ? profile.nombre[0].toUpperCase() : '?'
  const hasFoto = !!profile?.foto_perfil_url

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-[#2A2A2A] z-20"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex h-14">
        <button
          onClick={() => router.push('/planes')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 active:bg-[#141414] transition-colors ${
            !isOnPerfil ? 'text-[#E8692A]' : 'text-[#333333]'
          }`}
        >
          <ListTodo className="w-6 h-6" strokeWidth={!isOnPerfil ? 2 : 1.5} />
          <span className="text-[10px] font-medium leading-none uppercase tracking-[0.08em]">
            Planes
          </span>
        </button>

        <button
          onClick={() => router.push('/perfil')}
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
