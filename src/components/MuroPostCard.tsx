'use client'

import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { toggleLike } from '@/lib/actions'
import { CATEGORIA_COLOR, CATEGORIA_LABEL, DIFICULTAD_META, hace } from '@/lib/gooals'
import CompartirGooalStory from './CompartirGooalStory'
import Avatar from './Avatar'
import type { MuroPostFeed } from '@/types/gooals'

type Props = {
  post: MuroPostFeed
  onAutorClick?: (username: string | null) => void
}

export default function MuroPostCard({ post, onAutorClick }: Props) {
  const [liked, setLiked] = useState(post.liked)
  const [likes, setLikes] = useState(post.likes)
  const [, startTransition] = useTransition()

  const gooal = post.gooal
  const color = gooal ? CATEGORIA_COLOR[gooal.categoria] : '#666666'
  const dificultad = gooal ? DIFICULTAD_META[gooal.dificultad] : null

  const handleLike = () => {
    // Optimista: el contador se corrige con lo que devuelva el servidor.
    const siguiente = !liked
    setLiked(siguiente)
    setLikes(n => n + (siguiente ? 1 : -1))
    startTransition(async () => {
      const res = await toggleLike(post.id)
      setLiked(res.liked)
      setLikes(res.likes)
    })
  }

  return (
    <article style={{ background: '#111111', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
      {/* Cabecera: autor */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
        <button
          onClick={() => onAutorClick?.(post.autor.username)}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left active:opacity-70 transition-opacity"
        >
          <Avatar nombre={post.autor.nombre} foto={post.autor.foto_perfil_url} size={36} />
          <span className="min-w-0">
            <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#F0F0F0', lineHeight: 1.2 }}>
              {post.autor.nombre}
            </span>
            <span style={{ display: 'block', fontSize: 11, color: '#666666', lineHeight: 1.3 }}>
              {post.autor.username ? `@${post.autor.username} · ` : ''}{hace(post.created_at)}
            </span>
          </span>
        </button>
        {gooal && (
          <span
            style={{
              flexShrink: 0, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em',
              color, background: `${color}22`, borderRadius: 6, padding: '4px 8px',
            }}
          >
            {CATEGORIA_LABEL[gooal.categoria]}
          </span>
        )}
      </div>

      {/* Prueba: foto o vídeo a 4:5 con degradado inferior */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '4/5', background: '#0A0A0A' }}>
        {post.video_url ? (
          <video
            src={post.video_url}
            playsInline
            muted
            loop
            controls
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : post.foto_url ? (
          <img
            src={post.foto_url}
            alt={gooal?.titulo ?? ''}
            loading="lazy"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: '#141414' }} />
        )}

        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(to bottom, transparent 45%, rgba(0,0,0,0.85) 100%)',
          }}
        />

        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16 }}>
          {gooal && (
            <h2 style={{
              fontSize: 18, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.25, marginBottom: 8,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            } as React.CSSProperties}>
              {gooal.titulo}
            </h2>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {dificultad && (
              <span style={{
                fontSize: 11, fontWeight: 600, color: dificultad.color,
                background: 'rgba(0,0,0,0.45)', borderRadius: 999, padding: '4px 10px',
              }}>
                {dificultad.emoji} {dificultad.label}
              </span>
            )}
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#1DE9B6',
              background: 'rgba(29,233,182,0.14)', borderRadius: 999, padding: '4px 10px',
            }}>
              +{post.puntos} pts
            </span>
          </div>
        </div>
      </div>

      {post.descripcion && (
        <p style={{
          fontSize: 13, color: '#A0A0A0', lineHeight: 1.5, padding: '12px 14px 0',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        } as React.CSSProperties}>
          {post.descripcion}
        </p>
      )}

      {/* Acciones */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '12px 14px 14px' }}>
        <button
          onClick={handleLike}
          aria-label={liked ? 'Quitar me gusta' : 'Me gusta'}
          aria-pressed={liked}
          className="flex items-center gap-2 transition-colors active:scale-95"
          style={{ color: liked ? '#FF4D6D' : '#666666', fontSize: 13, minHeight: 44 }}
        >
          <Heart className="w-5 h-5" fill={liked ? '#FF4D6D' : 'none'} strokeWidth={liked ? 0 : 1.8} />
          <span>{likes}</span>
        </button>

        {gooal && (
          <CompartirGooalStory
            titulo={gooal.titulo}
            categoria={gooal.categoria}
            dificultad={gooal.dificultad}
            puntos={post.puntos}
            fotoUrl={post.foto_url}
            autor={post.autor.username ? `@${post.autor.username}` : post.autor.nombre}
          />
        )}
      </div>
    </article>
  )
}
