'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { Heart } from 'lucide-react'
import { toggleLike } from '@/lib/actions'
import { CATEGORIA_COLOR, CATEGORIA_LABEL, DIFICULTAD_META, hace } from '@/lib/gooals'
import CompartirGooalStory from './CompartirGooalStory'
import Avatar from './Avatar'
import { useFotoPrivada } from '@/components/FotosPrivadas'
import type { MuroPostFeed } from '@/types/gooals'

type Props = {
  post: MuroPostFeed
  onAutorClick?: (username: string | null) => void
}

export default function MuroPostCard({ post, onAutorClick }: Props) {
  // La dirección firmada de la foto, para la imagen que se comparte en Stories.
  // Es la misma petición que hace <Recuerdo>: el proveedor las junta.
  const { foto: fotoFirmada } = useFotoPrivada(post.userGooalId)

  const [liked, setLiked] = useState(post.liked)
  const [likes, setLikes] = useState(post.likes)
  const [, startTransition] = useTransition()

  const gooal = post.gooal
  const color = gooal ? CATEGORIA_COLOR[gooal.categoria] : '#7A8A85'
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

  /** ¿Esta persona subió una foto o un vídeo de este gooal? */
  const hayRecuerdo = Boolean(post.userGooalId && (post.video_url || post.foto_url))

  /**
   * El título y las pastillas, que van en el mismo sitio de las dos maneras:
   * encima de la foto cuando la hay, y en su propio hueco cuando no.
   *
   * Se escribe UNA vez y se coloca dos. Copiarlo era tener dos títulos que se
   * van separando, y el de abajo sería el que nadie mira.
   */
  const elGooal = (
    <>
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
          fontSize: 11, fontWeight: 700, color: '#00D1A7',
          background: 'rgba(0,209,167,0.14)', borderRadius: 999, padding: '4px 10px',
        }}>
          +{post.puntos} pts
        </span>
      </div>
    </>
  )

  return (
    <article style={{ background: '#161817', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
      {/* Cabecera: autor */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
        <button
          onClick={() => onAutorClick?.(post.autor.username)}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left active:opacity-70 transition-opacity"
        >
          <Avatar nombre={post.autor.nombre} foto={post.autor.foto_perfil_url} size={36} />
          <span className="min-w-0">
            <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#FFFFFF', lineHeight: 1.2 }}>
              {post.autor.nombre}
            </span>
            <span style={{ display: 'block', fontSize: 11, color: '#7A8A85', lineHeight: 1.3 }}>
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

      {/* ── EL GOOAL: SOBRE LA FOTO SI LA HAY, SOLO SI NO ──
          Antes el área de foto se pintaba SIEMPRE, y cuando no había foto
          quedaba un rectángulo liso de medio muro. No era un fallo: estaba
          decidido así pensando en «hay foto y no puedes verla». El problema es
          que ese no es el caso normal — de los 24 gooals conseguidos de la app,
          23 NO TIENEN FOTO, así que lo que se veía casi siempre era el hueco.
          Ahora son dos cosas distintas y se ven distintas. */}
      {hayRecuerdo ? (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '4/5', background: '#0B0B0B' }}>
          <Recuerdo userGooalId={post.userGooalId!} esVideo={Boolean(post.video_url)} titulo={gooal?.titulo ?? ''} />

          <div
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(to bottom, transparent 45%, rgba(0,0,0,0.85) 100%)',
            }}
          />

          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16 }}>
            {elGooal}
          </div>
        </div>
      ) : (
        // Sin foto no se reserva sitio para una foto: la tarjeta es más corta y
        // ya está. Un hueco vacío no es neutral — parece que algo ha fallado.
        <div style={{ padding: '14px 16px 2px' }}>{elGooal}</div>
      )}

      {post.descripcion && (
        <p style={{
          fontSize: 13, color: '#A3B1AC', lineHeight: 1.5, padding: '12px 14px 0',
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
          style={{ color: liked ? '#FF4D6D' : '#7A8A85', fontSize: 13, minHeight: 44 }}
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
            fotoUrl={fotoFirmada}
            autor={post.autor.username ? `@${post.autor.username}` : post.autor.nombre}
          />
        )}
      </div>
    </article>
  )
}

/**
 * La foto o el vídeo de un post, pedidos firmados.
 *
 * ── CUANDO NO SE PUEDE VER, SE DICE ───────────────────────
 *
 * Antes quedaba el hueco liso y sin una palabra, a propósito: decir «esta foto
 * es solo para sus amigos» cuenta algo de esa persona a quien no debería
 * saberlo. La intención era buena y el resultado era que la app parecía rota.
 *
 * La línea de ahora dice lo que PASA, no por qué: «No puedes ver esta foto».
 * Eso no añade nada que el hueco no dijera ya —quien mira sabe que hay un post
 * y que no ve la foto— y quita la sensación de avería. Lo que sigue sin
 * decirse es la regla: ni «solo amigos», ni «privada», ni qué le falta a quien
 * mira para verla.
 *
 * Solo se dice cuando ya se sabe: mientras la petición está en el aire no hay
 * ninguna frase, porque «no puedes verla» sería mentira durante medio segundo.
 */
function Recuerdo({ userGooalId, esVideo, titulo }: { userGooalId: string; esVideo: boolean; titulo: string }) {
  const { foto, video, puedeVer, cargando, refrescar } = useFotoPrivada(userGooalId)
  const reintentado = useRef(false)
  const fuente = esVideo ? video : foto

  useEffect(() => { reintentado.current = false }, [fuente])

  // Una dirección firmada caduca. Si falla, se pide otra vez; una sola, porque
  // si la segunda también falla es que el fichero no está.
  const alFallar = () => {
    if (reintentado.current) return
    reintentado.current = true
    refrescar()
  }

  if (!fuente) {
    return (
      <div style={{
        position: 'absolute', inset: 0, background: '#1E2120',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        {!cargando && !puedeVer && (
          <span style={{ fontSize: 13, color: '#7A8A85', textAlign: 'center' }}>
            No puedes ver esta foto
          </span>
        )}
      </div>
    )
  }

  const estilo: React.CSSProperties = {
    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
  }
  return esVideo
    ? <video src={fuente} playsInline muted loop controls onError={alFallar} style={estilo} />
    // eslint-disable-next-line @next/next/no-img-element -- direcciones firmadas que caducan
    : <img src={fuente} alt={titulo} loading="lazy" onError={alFallar} style={estilo} />
}
