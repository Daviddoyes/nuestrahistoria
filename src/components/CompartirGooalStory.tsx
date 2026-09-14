'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'
import {
  STORY_W, STORY_H, ACENTO, aBase64, cargarImg, drawCover, wrapText,
  rectRedondeado, compartirCanvas,
} from '@/lib/story-canvas'
import { DIFICULTAD_META, CATEGORIA_LABEL, type CategoriaGooal, type DificultadGooal } from '@/lib/gooals'

type Props = {
  titulo: string
  categoria: CategoriaGooal
  dificultad: DificultadGooal
  puntos: number
  fotoUrl: string | null
  autor: string
  compacto?: boolean
}

/** Genera una imagen 1080×1920 del gooal conseguido y la pasa al share sheet. */
export default function CompartirGooalStory({
  titulo, categoria, dificultad, puntos, fotoUrl, autor, compacto,
}: Props) {
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')

  const generar = async () => {
    setGenerando(true)
    setError('')
    try {
      const canvas = document.createElement('canvas')
      canvas.width = STORY_W
      canvas.height = STORY_H
      const ctx = canvas.getContext('2d')!

      ctx.fillStyle = '#0B0B0B'
      ctx.fillRect(0, 0, STORY_W, STORY_H)

      const marcoX = 60
      const marcoY = 420
      const marcoW = STORY_W - 120
      const marcoH = 1150

      if (fotoUrl) {
        const img = await cargarImg(await aBase64(fotoUrl))
        ctx.save()
        rectRedondeado(ctx, marcoX, marcoY, marcoW, marcoH, 32)
        ctx.clip()
        drawCover(ctx, img, marcoX, marcoY, marcoW, marcoH)
        // Degradado inferior para que el texto sobre la foto se lea siempre.
        const grad = ctx.createLinearGradient(0, marcoY + marcoH * 0.55, 0, marcoY + marcoH)
        grad.addColorStop(0, 'rgba(0,0,0,0)')
        grad.addColorStop(1, 'rgba(0,0,0,0.85)')
        ctx.fillStyle = grad
        ctx.fillRect(marcoX, marcoY, marcoW, marcoH)
        ctx.restore()
      } else {
        ctx.fillStyle = '#1E2120'
        rectRedondeado(ctx, marcoX, marcoY, marcoW, marcoH, 32)
        ctx.fill()
      }

      // Cabecera: check + puntos ganados.
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = ACENTO
      ctx.font = '700 72px system-ui, sans-serif'
      ctx.fillText('✓', STORY_W / 2, 190)

      ctx.font = '700 84px Inter, system-ui, sans-serif'
      ctx.fillText(`+${puntos} pts`, STORY_W / 2, 300)

      ctx.fillStyle = '#A3B1AC'
      ctx.font = '500 34px Inter, system-ui, sans-serif'
      const meta = DIFICULTAD_META[dificultad]
      ctx.fillText(`${CATEGORIA_LABEL[categoria]} · ${meta.emoji} ${meta.label}`, STORY_W / 2, 362)

      // Título sobre la parte baja de la foto.
      const size = titulo.length > 45 ? 46 : titulo.length > 25 ? 56 : 66
      ctx.font = `700 ${size}px Inter, system-ui, sans-serif`
      ctx.fillStyle = '#FFFFFF'
      const lineas = wrapText(ctx, titulo, marcoW - 100, 3)
      let ty = marcoY + marcoH - 90 - (lineas.length - 1) * (size + 12)
      for (const l of lineas) { ctx.fillText(l, STORY_W / 2, ty); ty += size + 12 }

      ctx.fillStyle = '#A3B1AC'
      ctx.font = '400 32px Inter, system-ui, sans-serif'
      ctx.fillText(autor, STORY_W / 2, marcoY + marcoH + 70)

      ctx.fillStyle = ACENTO
      ctx.font = '700 34px Inter, system-ui, sans-serif'
      ctx.fillText('GooALS.app', STORY_W / 2, STORY_H - 110)

      await compartirCanvas(canvas, 'gooals-logro.png', titulo)
    } catch (err) {
      console.error('[compartir gooal]', err)
      setError('No se pudo generar la imagen.')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <>
      <button
        onClick={generar}
        disabled={generando}
        aria-label="Compartir en Stories"
        className={`flex items-center gap-2 transition-colors disabled:opacity-60 ${
          compacto ? 'text-[#7A8A85] active:text-[#00D1A7]' : 'text-[#7A8A85] active:text-[#00D1A7] min-h-[44px]'
        }`}
        style={{ fontSize: 13 }}
      >
        {generando
          ? <span className="w-4 h-4 border border-[#00D1A7] border-t-transparent rounded-full animate-spin" />
          : <Share2 className="w-4 h-4" />
        }
        <span>{generando ? 'Generando...' : 'Compartir'}</span>
      </button>
      {error && <p className="text-xs text-[#FF5252] mt-1">{error}</p>}
    </>
  )
}
