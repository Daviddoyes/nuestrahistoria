'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { getListaSeguidores } from '@/lib/actions'
import { calcularNivel } from '@/lib/niveles'
import Avatar from './Avatar'
import type { UsuarioMini } from '@/types/gooals'

type Tipo = 'seguidores' | 'siguiendo'

type Props = {
  userId: string
  /** Por cuál de las dos se abre. Dentro se puede cambiar sin cerrar. */
  tipo: Tipo
  /** Para el número de cada pestaña. Sin ellos se pintan sin número. */
  cuantos?: Record<Tipo, number>
  onClose: () => void
  onUsuarioClick: (username: string | null) => void
}

/**
 * Las dos listas de gente, en un panel con dos pestañas.
 *
 * Son dos y no una porque **seguir no es ser amigo**: aquí uno puede seguir a
 * alguien que no le sigue. El número que se enseña en el perfil es uno solo
 * —los amigos, que es seguirse los dos—, pero detrás hay dos listas distintas y
 * las dos tienen que poder abrirse.
 */
export default function ListaUsuariosModal({ userId, tipo, cuantos, onClose, onUsuarioClick }: Props) {
  const [pestana, setPestana] = useState<Tipo>(tipo)
  /**
   * La lista cargada Y de qué pestaña es. Las dos cosas juntas y no en dos
   * estados: así, al cambiar de pestaña, lo ya cargado deja de valer sin tener
   * que vaciarlo a mano, que es lo que obligaba a tocar el estado dentro del
   * efecto y disparaba renderizados en cascada.
   */
  const [cargado, setCargado] = useState<{ tipo: Tipo; usuarios: UsuarioMini[] } | null>(null)
  const [error, setError] = useState('')

  const usuarios = cargado && cargado.tipo === pestana ? cargado.usuarios : null

  useEffect(() => {
    let vivo = true
    getListaSeguidores(userId, pestana)
      .then(lista => { if (vivo) setCargado({ tipo: pestana, usuarios: lista }) })
      .catch(e => {
        console.error('[ListaUsuariosModal]', e)
        if (vivo) { setError('No hemos podido cargar la lista.'); setCargado({ tipo: pestana, usuarios: [] }) }
      })
    return () => { vivo = false }
  }, [userId, pestana])

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
          <div role="tablist" style={{ display: 'flex', gap: 18 }}>
            {(['seguidores', 'siguiendo'] as const).map(t => (
              <button
                key={t}
                role="tab"
                aria-selected={pestana === t}
                onClick={() => setPestana(t)}
                className="fuente-titular transition-colors"
                style={{
                  fontSize: 16, fontWeight: 600, textTransform: 'capitalize', padding: '2px 0',
                  color: pestana === t ? '#FFFFFF' : '#7A8A85',
                  borderBottom: `2px solid ${pestana === t ? '#00D1A7' : 'transparent'}`,
                }}
              >
                {t}{cuantos ? ` ${cuantos[t]}` : ''}
              </button>
            ))}
          </div>
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
              {pestana === 'seguidores' ? 'Todavía no le sigue nadie.' : 'Todavía no sigue a nadie.'}
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
