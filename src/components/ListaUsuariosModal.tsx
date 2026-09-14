'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { getListaSeguidores } from '@/lib/actions'
import { calcularNivel } from '@/lib/niveles'
import Avatar from './Avatar'
import type { UsuarioMini } from '@/types/gooals'

type Props = {
  userId: string
  tipo: 'seguidores' | 'siguiendo'
  onClose: () => void
  onUsuarioClick: (username: string | null) => void
}

export default function ListaUsuariosModal({ userId, tipo, onClose, onUsuarioClick }: Props) {
  const [usuarios, setUsuarios] = useState<UsuarioMini[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    getListaSeguidores(userId, tipo)
      .then(lista => { if (vivo) setUsuarios(lista) })
      .catch(e => {
        console.error('[ListaUsuariosModal]', e)
        if (vivo) { setError('No hemos podido cargar la lista.'); setUsuarios([]) }
      })
    return () => { vivo = false }
  }, [userId, tipo])

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full bg-[#1E2120] rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col animate-[modal-slide-up_0.25s_ease-out]">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-9 h-1 bg-[#2A2E2C] rounded-full" />
        </div>

        <div className="px-5 py-3 flex items-center justify-between border-b border-[#2A2E2C] flex-shrink-0">
          <h2 className="fuente-titular font-semibold text-[#FFFFFF] text-base capitalize">{tipo}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-[#7A8A85] active:text-[#FFFFFF] w-8 h-8 flex items-center justify-center rounded-lg active:bg-[#2A2E2C] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto px-3 py-2"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
        >
          {usuarios === null ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-[#2A2E2C] border-t-[#00D1A7] rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="text-sm text-[#FF5252] px-2 py-6 text-center">{error}</p>
          ) : usuarios.length === 0 ? (
            <p className="text-sm text-[#7A8A85] px-2 py-10 text-center">
              {tipo === 'seguidores' ? 'Todavía no le sigue nadie.' : 'Todavía no sigue a nadie.'}
            </p>
          ) : (
            usuarios.map(u => {
              const nivel = calcularNivel(u.puntos_totales ?? 0)
              return (
                <button
                  key={u.id}
                  onClick={() => onUsuarioClick(u.username)}
                  className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl active:bg-[#2A2E2C] transition-colors text-left"
                >
                  <Avatar nombre={u.nombre} foto={u.foto_perfil_url} size={42} borde={nivel.color} />
                  <span className="flex-1 min-w-0">
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>
                      {u.nombre}
                    </span>
                    <span style={{ display: 'block', fontSize: 12, color: '#7A8A85' }}>
                      {u.username ? `@${u.username}` : '—'}
                    </span>
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: nivel.color, flexShrink: 0 }}>
                    {u.puntos_totales ?? 0} pts
                  </span>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
