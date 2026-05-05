'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Crown, LogOut, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface UserMenuProps {
  nombre: string
  plan: 'free' | 'premium'
}

export default function UserMenu({ nombre, plan }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    setOpen(false)
    await supabase.auth.signOut()
    router.push('/')
  }

  const initial = nombre ? nombre[0].toUpperCase() : '?'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full bg-[#C9B99A] text-[#0A0A0A] font-semibold text-sm flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Menú de usuario"
      >
        {initial}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-30 w-52 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2A2A2A]">
              <p className="text-sm font-medium text-[#F0F0F0] truncate">{nombre}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {plan === 'premium' && <Crown className="w-3 h-3 text-[#C9B99A]" />}
                <p className="text-xs text-[#666666]">
                  {plan === 'premium' ? 'Premium' : 'Plan gratuito'}
                </p>
              </div>
            </div>

            {plan === 'free' && (
              <button
                onClick={() => {
                  setOpen(false)
                  router.push('/pricing')
                }}
                className="w-full px-4 py-3 text-left text-sm text-[#C9B99A] flex items-center gap-2 active:bg-[#2A2A2A] transition-colors"
              >
                <Crown className="w-4 h-4" />
                Hacerse Premium
              </button>
            )}

            <button
              onClick={() => {
                setOpen(false)
                router.push('/onboarding')
              }}
              className="w-full px-4 py-3 text-left text-sm text-[#F0F0F0] flex items-center gap-2 active:bg-[#2A2A2A] transition-colors"
            >
              <User className="w-4 h-4" />
              Mi cuenta
            </button>

            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 text-left text-sm text-[#666666] flex items-center gap-2 active:bg-[#2A2A2A] transition-colors border-t border-[#2A2A2A]"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  )
}
