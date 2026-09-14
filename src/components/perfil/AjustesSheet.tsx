'use client'

import { X, Pencil, UserPlus, LogOut } from 'lucide-react'
import CompartirPerfilStory from '@/components/CompartirPerfilStory'
import type { PerfilCompleto } from '@/types/gooals'

type Props = {
  perfil: PerfilCompleto
  onClose: () => void
  onEditar: () => void
  onInvitar: () => void
  onCerrarSesion: () => void
}

const fila = 'w-full flex items-center gap-3 px-4 min-h-[52px] rounded-xl text-[15px] transition-colors'

/**
 * Lo que antes colgaba bajo el perfil propio. La búsqueda de personas NO está
 * aquí a propósito: es como se descubre gente, y enterrarla en un menú la mata.
 */
export default function AjustesSheet({ perfil, onClose, onEditar, onInvitar, onCerrarSesion }: Props) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-labelledby="ajustes-titulo"
        className="w-full bg-[#1E2120] rounded-t-2xl shadow-2xl animate-[modal-slide-up_0.25s_ease-out]"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 bg-[#2A2E2C] rounded-full" />
        </div>

        <div className="px-5 py-3 flex items-center justify-between border-b border-[#2A2E2C]">
          <h2 id="ajustes-titulo" className="fuente-titular font-semibold text-[#FFFFFF] text-base">Ajustes</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-[#7A8A85] active:text-[#FFFFFF] w-11 h-11 -mr-2 flex items-center justify-center rounded-lg active:bg-[#2A2E2C] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-3 pt-3 flex flex-col gap-1">
          <button onClick={onEditar} className={`${fila} text-[#FFFFFF] active:bg-[#2A2E2C]`}>
            <Pencil className="w-4 h-4 text-[#A3B1AC]" /> Editar perfil
          </button>

          <div className="px-1 py-1">
            <CompartirPerfilStory perfil={perfil} />
          </div>

          <button onClick={onInvitar} className={`${fila} text-[#FFFFFF] active:bg-[#2A2E2C]`}>
            <UserPlus className="w-4 h-4 text-[#A3B1AC]" /> Invitar a un amigo
          </button>

          <button onClick={onCerrarSesion} className={`${fila} text-[#FF5252] active:bg-[rgba(255,82,82,0.14)]`}>
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
