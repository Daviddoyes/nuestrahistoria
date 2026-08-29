'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { getMuroPost } from '@/lib/actions'
import MuroPostCard from './MuroPostCard'
import type { MuroPostFeed } from '@/types/gooals'

type Props = {
  postId: string
  onClose: () => void
  onAutorClick?: (username: string | null) => void
}

/** Abre un post concreto del muro (desde el grid de logros del perfil). */
export default function PostDetailModal({ postId, onClose, onAutorClick }: Props) {
  const [post, setPost] = useState<MuroPostFeed | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    getMuroPost(postId)
      .then(p => {
        if (!vivo) return
        if (!p) setError('Este logro ya no está disponible.')
        else setPost(p)
      })
      .catch(e => {
        console.error('[PostDetailModal]', e)
        if (vivo) setError('No hemos podido cargar el logro.')
      })
    return () => { vivo = false }
  }, [postId])

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="fixed right-4 z-[80] w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white/70 active:bg-black/70 active:text-white transition-colors"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <X className="w-4 h-4" />
      </button>

      <div className="w-full max-w-md max-h-[88vh] overflow-y-auto">
        {error ? (
          <p className="text-sm text-[#C97B7B] bg-[#141414] px-4 py-6 rounded-2xl text-center">{error}</p>
        ) : !post ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-[#2A2A2A] border-t-[#1DE9B6] rounded-full animate-spin" />
          </div>
        ) : (
          <MuroPostCard post={post} onAutorClick={onAutorClick} />
        )}
      </div>
    </div>
  )
}
