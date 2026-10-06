'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useFotoPrivada } from '@/components/FotosPrivadas'
import { CATEGORIA_LABEL } from '@/lib/gooals'
import type { Conquistado } from '@/types/gooals'

type Props = {
  conquistado: Conquistado
  onClose: () => void
}

/**
 * Enseña la prueba de un gooal conquistado que no tiene post en el muro (si al
 * completarlo falló la publicación). La foto o el vídeo siguen en user_gooals,
 * y al usuario le da igual si hubo post: lo que quiere es ver su recuerdo.
 */
export default function VisorLogro({ conquistado, onClose }: Props) {
  const { gooal, foto_url, video_url, puntos, completado_at } = conquistado
  // Las direcciones de la fila son rutas de un cubo privado: no se pueden
  // pintar. La de verdad se pide firmada, y si caduca se vuelve a pedir.
  const { foto, video, refrescar } = useFotoPrivada(conquistado.userGooalId)
  const reintentado = useRef(false)
  useEffect(() => { reintentado.current = false }, [foto, video])
  const alFallar = () => { if (reintentado.current) return; reintentado.current = true; refrescar() }
  const fecha = completado_at
    ? new Date(completado_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div
      role="dialog"
      aria-label={gooal.titulo}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="fixed right-4 z-[80] w-11 h-11 flex items-center justify-center rounded-full bg-black/50 text-white/80 active:bg-black/70 active:text-white transition-colors"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <X className="w-4 h-4" />
      </button>

      <article className="w-full max-w-md max-h-[88vh] overflow-y-auto" style={{ background: '#161817', borderRadius: 16 }}>
        {video_url && video ? (
          <video src={video} controls playsInline autoPlay onError={alFallar} style={{ width: '100%', display: 'block', background: '#000' }} />
        ) : foto_url && foto ? (
          // eslint-disable-next-line @next/next/no-img-element -- foto de Storage de tamaño variable
          <img src={foto} alt={gooal.titulo} onError={alFallar} style={{ width: '100%', display: 'block' }} />
        ) : (
          <p style={{ padding: '32px 20px 8px', fontSize: 14, color: '#A3B1AC', textAlign: 'center' }}>
            Este gooal se conquistó sin foto ni vídeo guardados.
          </p>
        )}

        <div style={{ padding: '14px 16px 16px' }}>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7A8A85' }}>
            {CATEGORIA_LABEL[gooal.categoria]}
          </p>
          <p className="fuente-titular" style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginTop: 4, lineHeight: 1.25 }}>
            {gooal.titulo}
          </p>
          <p style={{ fontSize: 13, marginTop: 6, color: '#7A8A85' }}>
            <span style={{ color: '#00D1A7', fontWeight: 600 }}>+{puntos} pts</span>
            {fecha && <> · {fecha}</>}
          </p>
        </div>
      </article>
    </div>
  )
}
