'use client'

import { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import { searchUsers } from '@/lib/actions'
import Avatar from './Avatar'

type Resultado = { id: string; nombre: string; username: string; foto_perfil_url: string | null }

type Props = {
  onClose: () => void
  onUsuarioClick: (username: string) => void
}

/** Buscador de personas por @username, para abrir su perfil público. */
export default function BuscarUsuariosSheet({ onClose, onUsuarioClick }: Props) {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    const limpio = query.trim()
    if (limpio.length < 2) { setResultados([]); return }

    // Debounce: sin esto se dispara una consulta por tecla pulsada.
    setBuscando(true)
    const t = setTimeout(async () => {
      try {
        setResultados(await searchUsers(limpio))
      } catch (e) {
        console.error('[BuscarUsuariosSheet]', e)
        setResultados([])
      } finally {
        setBuscando(false)
      }
    }, 350)

    return () => clearTimeout(t)
  }, [query])

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
          <h2 className="fuente-titular font-semibold text-[#FFFFFF] text-base">Buscar personas</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-[#7A8A85] active:text-[#FFFFFF] w-8 h-8 flex items-center justify-center rounded-lg active:bg-[#2A2E2C] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pt-4 flex-shrink-0">
          <div style={{ position: 'relative' }}>
            <Search
              className="w-4 h-4"
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#7A8A85' }}
            />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value.replace(/^@/, ''))}
              placeholder="@usuario"
              autoFocus
              aria-label="Buscar por nombre de usuario"
              className="w-full rounded-xl border border-[#2A2E2C] bg-[#2A2E2C] text-[#FFFFFF] placeholder-[#7A8A85] focus:outline-none focus:border-[#00D1A7] text-base"
              style={{ padding: '11px 14px 11px 40px' }}
            />
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto px-3 py-3"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
        >
          {query.trim().length < 2 ? (
            <p className="text-sm text-[#7A8A85] px-2 py-8 text-center">
              Escribe al menos 2 letras del @usuario.
            </p>
          ) : buscando ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-[#2A2E2C] border-t-[#00D1A7] rounded-full animate-spin" />
            </div>
          ) : resultados.length === 0 ? (
            <p className="text-sm text-[#7A8A85] px-2 py-8 text-center">Nadie con ese usuario.</p>
          ) : (
            resultados.map(u => (
              <button
                key={u.id}
                onClick={() => onUsuarioClick(u.username)}
                className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl active:bg-[#2A2E2C] transition-colors text-left"
              >
                <Avatar nombre={u.nombre} foto={u.foto_perfil_url} size={42} />
                <span className="flex-1 min-w-0">
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>
                    {u.nombre}
                  </span>
                  <span style={{ display: 'block', fontSize: 12, color: '#7A8A85' }}>@{u.username}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
