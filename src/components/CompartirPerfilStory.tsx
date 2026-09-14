'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'
import {
  STORY_W, STORY_H, ACENTO, aBase64, cargarImg, drawCover, wrapText,
  rectRedondeado, compartirCanvas,
} from '@/lib/story-canvas'
import { calcularNivel, progresoNivel } from '@/lib/niveles'
import { CATEGORIA_EMOJI, CATEGORIA_LABEL } from '@/lib/gooals'
import type { PerfilCompleto } from '@/types/gooals'

type Props = { perfil: PerfilCompleto }

/** Imagen 1080×1920 con las stats del perfil, lista para Stories. */
export default function CompartirPerfilStory({ perfil }: Props) {
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

      const nivel = calcularNivel(perfil.puntos)
      const progreso = progresoNivel(perfil.puntos)

      // Avatar circular centrado.
      const avatarR = 110
      const avatarCX = STORY_W / 2
      const avatarCY = 380
      if (perfil.usuario.foto_perfil_url) {
        const img = await cargarImg(await aBase64(perfil.usuario.foto_perfil_url))
        ctx.save()
        ctx.beginPath()
        ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2)
        ctx.clip()
        drawCover(ctx, img, avatarCX - avatarR, avatarCY - avatarR, avatarR * 2, avatarR * 2)
        ctx.restore()
      } else {
        ctx.fillStyle = ACENTO
        ctx.beginPath()
        ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#0B0B0B'
        ctx.font = '700 96px Inter, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(perfil.usuario.nombre[0]?.toUpperCase() ?? '?', avatarCX, avatarCY + 4)
        ctx.textBaseline = 'alphabetic'
      }

      ctx.strokeStyle = nivel.color
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.arc(avatarCX, avatarCY, avatarR + 4, 0, Math.PI * 2)
      ctx.stroke()

      ctx.textAlign = 'center'
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '700 60px Inter, system-ui, sans-serif'
      const nombreLineas = wrapText(ctx, perfil.usuario.nombre, STORY_W - 160, 2)
      let ny = 570
      for (const l of nombreLineas) { ctx.fillText(l, STORY_W / 2, ny); ny += 68 }

      if (perfil.usuario.username) {
        ctx.fillStyle = '#7A8A85'
        ctx.font = '400 36px Inter, system-ui, sans-serif'
        ctx.fillText(`@${perfil.usuario.username}`, STORY_W / 2, ny + 6)
      }

      // Mandan los gooals conquistados, como en el perfil; los puntos van debajo
      // y más pequeños. La app va de cuántas cosas distintas has vivido.
      const conquistados = perfil.conquistados.length
      // next/font registra Poppins con un nombre interno generado, no "Poppins":
      // se lee de la variable CSS y se espera a que cargue, o el canvas pintaría
      // con la fuente de reserva sin avisar.
      const poppins = getComputedStyle(document.body).getPropertyValue('--font-poppins').trim() || 'Poppins'
      await Promise.all([
        document.fonts.load(`800 150px ${poppins}`),
        document.fonts.load(`700 56px ${poppins}`),
      ])

      ctx.fillStyle = '#FFFFFF'
      ctx.font = `800 150px ${poppins}, Inter, system-ui, sans-serif`
      ctx.fillText(String(conquistados), STORY_W / 2, ny + 180)

      ctx.fillStyle = '#7A8A85'
      ctx.font = '600 30px Inter, system-ui, sans-serif'
      ctx.fillText(conquistados === 1 ? 'GOOAL CONQUISTADO' : 'GOOALS CONQUISTADOS', STORY_W / 2, ny + 230)

      ctx.fillStyle = ACENTO
      ctx.font = `700 56px ${poppins}, Inter, system-ui, sans-serif`
      ctx.fillText(`${perfil.puntos} pts`, STORY_W / 2, ny + 314)

      ctx.fillStyle = nivel.color
      ctx.font = '600 40px Inter, system-ui, sans-serif'
      ctx.fillText(`Nivel: ${nivel.nombre}`, STORY_W / 2, ny + 370)

      // Barra de progreso hacia el siguiente nivel.
      const barraX = 140
      const barraY = ny + 420
      const barraW = STORY_W - 280
      ctx.fillStyle = '#2A2E2C'
      rectRedondeado(ctx, barraX, barraY, barraW, 22, 11)
      ctx.fill()
      ctx.fillStyle = ACENTO
      const anchoProgreso = Math.max(22, Math.round((barraW * progreso.porcentaje) / 100))
      rectRedondeado(ctx, barraX, barraY, anchoProgreso, 22, 11)
      ctx.fill()

      if (progreso.siguiente) {
        ctx.fillStyle = '#A3B1AC'
        ctx.font = '400 30px Inter, system-ui, sans-serif'
        ctx.fillText(
          `${perfil.puntos}/${progreso.siguiente.minPuntos} para ${progreso.siguiente.nombre}`,
          STORY_W / 2, barraY + 66
        )
      }

      // Categorías con algo conquistado, de más a menos. En la imagen no caben las
      // de 0: aquí se enseña lo vivido, no lo que falta por probar.
      const conProgreso = perfil.porCategoria.filter(s => s.conquistados > 0).slice(0, 6)
      let cy = barraY + 160
      ctx.font = '500 34px Inter, system-ui, sans-serif'
      for (const s of conProgreso) {
        ctx.fillStyle = '#A3B1AC'
        ctx.fillText(
          `${CATEGORIA_EMOJI[s.categoria]}  ${CATEGORIA_LABEL[s.categoria]} · ${s.conquistados}`,
          STORY_W / 2, cy
        )
        cy += 54
      }

      ctx.fillStyle = '#7A8A85'
      ctx.font = '400 32px Inter, system-ui, sans-serif'
      ctx.fillText(
        `${perfil.seguidores} seguidores · ${perfil.siguiendo} siguiendo`,
        STORY_W / 2, STORY_H - 220
      )

      ctx.fillStyle = ACENTO
      ctx.font = '700 34px Inter, system-ui, sans-serif'
      ctx.fillText('GooALS.app', STORY_W / 2, STORY_H - 110)

      await compartirCanvas(canvas, 'gooals-perfil.png', perfil.usuario.nombre)
    } catch (err) {
      console.error('[compartir perfil]', err)
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
        className="w-full py-3.5 rounded-xl border border-[#2A2E2C] text-[#FFFFFF] active:bg-[#1E2120] transition-colors text-sm font-medium min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {generando
          ? <span className="w-4 h-4 border-2 border-[#00D1A7] border-t-transparent rounded-full animate-spin" />
          : <Share2 className="w-4 h-4" />
        }
        {generando ? 'Generando...' : 'Compartir perfil'}
      </button>
      {error && <p className="text-xs text-[#FF5252] mt-1.5 text-center">{error}</p>}
    </>
  )
}
