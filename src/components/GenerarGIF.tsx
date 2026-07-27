'use client'

import { useState } from 'react'
import { Film } from 'lucide-react'
import ShareStoryImage from './ShareStoryImage'
import type { Plan } from '@/types/planes'

type Props = {
  plan: Plan
  descripcion?: string
}

const W = 1080
const H = 1920
const ACENTO = '#1DE9B6'

// Imagen remota → dataURL (vía proxy para evitar CORS al pintar en canvas).
async function toBase64(url: string): Promise<string> {
  const res = await fetch('/api/proxy-image?url=' + encodeURIComponent(url))
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onloadend = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

function cargarImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// object-fit: cover dentro de la caja (x,y,w,h).
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const ir = img.width / img.height
  const br = w / h
  let sw = img.width, sh = img.height, sx = 0, sy = 0
  if (ir > br) { sw = img.height * br; sx = (img.width - sw) / 2 }
  else { sh = img.width / br; sy = (img.height - sh) / 2 }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w }
    else line = test
  }
  if (line) lines.push(line)
  return lines.slice(0, 3)
}

function dibujarFrame(ctx: CanvasRenderingContext2D, img: HTMLImageElement, titulo: string) {
  ctx.clearRect(0, 0, W, H)

  // 1) Fondo: la propia foto, borrosa y oscura.
  ctx.save()
  ctx.filter = 'blur(30px)'
  drawCover(ctx, img, -80, -80, W + 160, H + 160)
  ctx.restore()

  // 2) Overlay oscuro.
  ctx.fillStyle = 'rgba(0,0,0,0.85)'
  ctx.fillRect(0, 0, W, H)

  // 3) Foto enmarcada, centrada.
  const ratio = img.width / img.height
  const MAXW = 840, MAXH = 1040
  let fw: number, fh: number
  if (ratio > 1) { fw = MAXW; fh = Math.round(MAXW / ratio) }
  else { fh = MAXH; fw = Math.round(MAXH * ratio); if (fw > MAXW) { fw = MAXW; fh = Math.round(MAXW / ratio) } }
  const fx = Math.round((W - fw) / 2)
  const fy = Math.round((H - fh) / 2) + 70
  const b = 12
  ctx.fillStyle = ACENTO
  ctx.fillRect(fx - b, fy - b, fw + 2 * b, fh + 2 * b)
  drawCover(ctx, img, fx, fy, fw, fh)

  // 4) Título arriba, centrado, con ✓ turquesa encima.
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = ACENTO
  ctx.font = '700 64px system-ui, sans-serif'
  ctx.fillText('✓', W / 2, 200)

  const size = titulo.length > 45 ? 44 : titulo.length > 25 ? 54 : 64
  ctx.font = `700 ${size}px "Playfair Display", Georgia, serif`
  ctx.fillStyle = '#F0F0F0'
  const lineas = wrapText(ctx, titulo, W - 160)
  let ty = 300
  for (const l of lineas) { ctx.fillText(l, W / 2, ty); ty += size + 14 }

  // 5) "GooALS.app" abajo.
  ctx.fillStyle = ACENTO
  ctx.font = '700 34px Inter, system-ui, sans-serif'
  ctx.fillText('GooALS.app', W / 2, H - 110)
}

export default function GenerarGIF({ plan, descripcion }: Props) {
  const fotos = [plan.foto_url, ...(plan.momentos_urls ?? [])].filter((u): u is string => Boolean(u))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 0 o 1 fotos → imagen estática de siempre.
  if (fotos.length < 2) {
    return <ShareStoryImage plan={plan} descripcion={descripcion ?? ''} />
  }

  const generar = async () => {
    setLoading(true)
    setError('')
    try {
      // Aseguramos las fuentes cargadas antes de pintar texto en canvas.
      if (document.fonts?.ready) await document.fonts.ready

      const { default: GIF } = await import('gif.js')
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: W,
        height: H,
        workerScript: '/gif.worker.js',
        background: '#0A0A0A',
      })

      for (const url of fotos) {
        const img = await cargarImg(await toBase64(url))
        const canvas = document.createElement('canvas')
        canvas.width = W
        canvas.height = H
        const ctx = canvas.getContext('2d')!
        dibujarFrame(ctx, img, plan.titulo)
        gif.addFrame(canvas, { delay: 2000, copy: true })
      }

      const blob = await new Promise<Blob>((resolve, reject) => {
        gif.on('finished', resolve)
        gif.on('abort', () => reject(new Error('render abortado')))
        gif.render()
      })

      const file = new File([blob], 'gooals-historia.gif', { type: 'image/gif' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: plan.titulo })
      } else {
        const u = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = u
        a.download = 'gooals-historia.gif'
        a.click()
        URL.revokeObjectURL(u)
      }
    } catch (e) {
      console.error('[GIF]', e)
      setError('No se pudo generar el GIF. Inténtalo otra vez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={generar}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2.5 border border-[#2A2A2A] rounded-xl text-sm text-[#F0F0F0] active:bg-[#1A1A1A] transition-colors disabled:opacity-60 min-h-[44px]"
      >
        {loading
          ? <span className="w-4 h-4 border-2 border-[#1DE9B6] border-t-transparent rounded-full animate-spin" />
          : <Film className="w-4 h-4 text-[#1DE9B6]" />
        }
        {loading ? 'Generando GIF... puede tardar unos segundos' : 'Compartir como GIF'}
      </button>
      {error && <p className="text-sm text-[#C97B7B] mt-2">{error}</p>}
    </>
  )
}
