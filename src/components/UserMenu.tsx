'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface UserMenuProps {
  nombre: string
  fotoPerfil?: string | null
}

export default function UserMenu({ nombre, fotoPerfil }: UserMenuProps) {
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
        className="w-8 h-8 rounded-full overflow-hidden bg-[#00D1A7] text-[#0B0B0B] font-semibold text-sm flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Menú de usuario"
      >
        {fotoPerfil ? (
          <img src={fotoPerfil} alt="" className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-30 w-48 bg-[#2A2E2C] border border-[#2A2E2C] rounded-xl shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2A2E2C]">
              <p className="text-sm font-medium text-[#FFFFFF] truncate">{nombre}</p>
            </div>

            <button
              onClick={() => { setOpen(false); router.push('/perfil') }}
              className="w-full px-4 py-3 text-left text-sm text-[#FFFFFF] flex items-center gap-2 active:bg-[#2A2E2C] transition-colors"
            >
              <User className="w-4 h-4" />
              Mi perfil
            </button>

            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 text-left text-sm text-[#7A8A85] flex items-center gap-2 active:bg-[#2A2E2C] transition-colors border-t border-[#2A2E2C]"
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
