'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { X, User, Heart, Users, Globe, Search, UserPlus } from 'lucide-react'
import type { ConQuien } from '@/types/planes'
import { createClient } from '@/lib/supabase/client'

type InvitadoResult = { id: string; nombre: string; username: string; foto_perfil_url: string | null }

type Props = {
  onClose: () => void
  onSubmit: (titulo: string, descripcion: string | null, conQuien: ConQuien, invitadoIds: string[]) => Promise<void>
}

const CON_QUIEN_OPTIONS: { value: ConQuien; label: string; icon: React.ElementType }[] = [
  { value: 'solo', label: 'Solo', icon: User },
  { value: 'pareja', label: 'Pareja', icon: Heart },
  { value: 'amigos', label: 'Amigos', icon: Users },
  { value: 'todos', label: 'Todos', icon: Globe },
]

function Avatar({ item }: { item: InvitadoResult }) {
  if (item.foto_perfil_url) {
    return <img src={item.foto_perfil_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
  }
  return (
    <div className="w-7 h-7 rounded-full bg-[#E8692A] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
      {item.nombre?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

export default function NuevoPlanModal({ onClose, onSubmit }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [conQuien, setConQuien] = useState<ConQuien>('todos')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<InvitadoResult[]>([])
  const [searching, setSearching] = useState(false)
  const [invitados, setInvitados] = useState<InvitadoResult[]>([])
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, nombre, username, foto_perfil_url')
        .ilike('username', `%${searchQuery.trim()}%`)
        .limit(5)
      setSearchResults((data ?? []) as InvitadoResult[])
      setSearching(false)
    }, 300)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [searchQuery, supabase])

  const addInvitado = (item: InvitadoResult) => {
    if (!invitados.find(i => i.id === item.id)) setInvitados(prev => [...prev, item])
    setSearchQuery('')
    setSearchResults([])
  }

  const removeInvitado = (id: string) => setInvitados(prev => prev.filter(i => i.id !== id))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) return
    setLoading(true)
    setError('')
    try {
      await onSubmit(titulo.trim(), descripcion.trim() || null, conQuien, invitados.map(i => i.id))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el plan'
      setError(msg)
      console.error('[NuevoPlanModal]', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full bg-[#141414] rounded-t-2xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-9 h-1 bg-[#2A2A2A] rounded-full" />
        </div>

        <div className="px-5 py-3 flex items-center justify-between flex-shrink-0">
          <h2 className="font-serif font-semibold text-[#F0F0F0] text-base">Nuevo plan</h2>
          <button
            onClick={onClose}
            className="text-[#444444] active:text-[#F0F0F0] w-8 h-8 flex items-center justify-center rounded-lg active:bg-[#1A1A1A] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-1.5">
              Título
            </label>
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ej: Ver el atardecer en la playa"
              className="w-full px-4 py-3.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#E8692A] text-base"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-1.5">
              Descripción{' '}
              <span className="text-[#444444] normal-case tracking-normal">(opcional)</span>
            </label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Añade más detalles..."
              rows={2}
              className="w-full px-4 py-3.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#E8692A] resize-none text-base"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-2">
              Con quién
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CON_QUIEN_OPTIONS.map(({ value, label, icon: Icon }) => {
                const active = conQuien === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setConQuien(value)}
                    className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                      active
                        ? 'bg-[#E8692A] border-[#E8692A] text-white'
                        : 'border-[#2A2A2A] text-[#666666] active:bg-[#1A1A1A]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Invite section */}
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-2">
              Invitar personas
            </label>

            {invitados.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {invitados.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-full pl-1 pr-2 py-1"
                  >
                    <Avatar item={item} />
                    <span className="text-xs text-[#F0F0F0]">{item.nombre}</span>
                    <button
                      type="button"
                      onClick={() => removeInvitado(item.id)}
                      className="text-[#444444] active:text-[#E8692A] ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444444]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por @username"
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#E8692A] text-sm"
              />
            </div>

            {(searching || searchResults.length > 0) && (
              <div className="mt-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
                {searching && (
                  <div className="px-4 py-3 text-xs text-[#666666]">Buscando...</div>
                )}
                {!searching && searchResults.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addInvitado(item)}
                    disabled={!!invitados.find(i => i.id === item.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 active:bg-[#2A2A2A] transition-colors disabled:opacity-40 border-b border-[#222222] last:border-0"
                  >
                    <Avatar item={item} />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-[#F0F0F0] truncate">{item.nombre}</p>
                      <p className="text-xs text-[#666666]">@{item.username}</p>
                    </div>
                    <UserPlus className="w-4 h-4 text-[#E8692A] flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-[#C97B7B] bg-[#8B3A3A]/20 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div
            className="flex gap-3"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl border border-[#2A2A2A] text-[#666666] active:bg-[#1A1A1A] transition-colors text-sm font-medium min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!titulo.trim() || loading}
              className="flex-1 bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-30 disabled:cursor-not-allowed text-white py-3.5 rounded-xl transition-colors text-sm font-semibold min-h-[44px]"
            >
              {loading ? 'Guardando...' : 'Añadir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
