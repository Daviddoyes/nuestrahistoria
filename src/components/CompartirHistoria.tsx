'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'
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
  if (!res.ok) throw new Error(`proxy-image ${res.status}`)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onloadend = () => resolve(r.result as string)
    r.onerror = () => reject(new Error('FileReader falló'))
    r.readAsDataURL(blob)
  })
}

function cargarImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
    img.src = src
  })
}

// object-fit: cover dentro de la caja.
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

function dibujarTitulo(ctx: CanvasRenderingContext2D, titulo: string) {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = ACENTO
  ctx.font = '700 64px system-ui, sans-serif'
  ctx.fillText('✓', W / 2, 200)

  const size = titulo.length > 45 ? 44 : titulo.length > 25 ? 54 : 64
  ctx.font = `700 ${size}px Inter, system-ui, sans-serif`
  ctx.fillStyle = '#F0F0F0'
  let ty = 300
  for (const l of wrapText(ctx, titulo, W - 160)) { ctx.fillText(l, W / 2, ty); ty += size + 14 }
}

function dibujarFooter(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = ACENTO
  ctx.font = '700 34px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('GooALS.app', W / 2, H - 110)
}

// Celdas del collage según nº de fotos (2 columnas / 3 con banda / 2x2).
function celdas(n: number, gx: number, gy: number, gw: number, gh: number, gap: number): [number, number, number, number][] {
  const cw = (gw - gap) / 2, ch = (gh - gap) / 2
  if (n <= 1) return [[gx, gy, gw, gh]]
  if (n === 2) return [[gx, gy, cw, gh], [gx + cw + gap, gy, cw, gh]]
  if (n === 3) return [[gx, gy, cw, ch], [gx + cw + gap, gy, cw, ch], [gx, gy + ch + gap, gw, ch]]
  return [
    [gx, gy, cw, ch], [gx + cw + gap, gy, cw, ch],
    [gx, gy + ch + gap, cw, ch], [gx + cw + gap, gy + ch + gap, cw, ch],
  ]
}

export default function CompartirHistoria({ plan, descripcion }: Props) {
  const fotos = [plan.foto_url, ...(plan.momentos_urls ?? [])].filter((u): u is string => Boolean(u))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 0 o 1 fotos → imagen individual de siempre.
  if (fotos.length < 2) {
    return <ShareStoryImage plan={plan} descripcion={descripcion ?? ''} />
  }

  const generar = async () => {
    setLoading(true)
    setError('')
    console.log('[compartir] iniciando, fotos:', fotos.length)
    try {
      const imgs = await Promise.all(
        fotos.slice(0, 4).map(async url => cargarImg(await toBase64(url)))
      )
      console.log('[compartir] imágenes cargadas:', imgs.length)

      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#0A0A0A'
      ctx.fillRect(0, 0, W, H)

      const rects = celdas(imgs.length, 60, 380, W - 120, 1300, 14)
      imgs.forEach((img, i) => {
        const [x, y, w, h] = rects[i]
        drawCover(ctx, img, x, y, w, h)
      })

      dibujarTitulo(ctx, plan.titulo)
      dibujarFooter(ctx)

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob falló')), 'image/png')
      })

      const file = new File([blob], 'gooals-historia.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: plan.titulo })
      } else {
        const u = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = u
        a.download = 'gooals-historia.png'
        a.click()
        URL.revokeObjectURL(u)
      }
      console.log('[compartir] listo')
    } catch (err) {
      console.error('[compartir] error completo:', err)
      setError(`Error: ${err instanceof Error ? err.message : JSON.stringify(err)}`)
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
          : <Share2 className="w-4 h-4 text-[#1DE9B6]" />
        }
        {loading ? 'Generando...' : 'Compartir historia'}
      </button>
      {error && <p className="text-sm text-[#C97B7B] mt-2 break-words">{error}</p>}
    </>
  )
}
