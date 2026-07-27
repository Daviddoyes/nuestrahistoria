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
  if (!res.ok) throw new Error(`proxy-image ${res.status} para ${url}`)
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
    img.onerror = () => reject(new Error('No se pudo cargar la imagen en canvas'))
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

function dibujarTitulo(ctx: CanvasRenderingContext2D, titulo: string) {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = ACENTO
  ctx.font = '700 64px system-ui, sans-serif'
  ctx.fillText('✓', W / 2, 200)

  const size = titulo.length > 45 ? 44 : titulo.length > 25 ? 54 : 64
  ctx.font = `700 ${size}px "Playfair Display", Georgia, serif`
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

// Un frame del GIF: fondo borroso + overlay + título + foto enmarcada + footer.
function dibujarFrame(ctx: CanvasRenderingContext2D, img: HTMLImageElement, titulo: string) {
  ctx.clearRect(0, 0, W, H)
  ctx.save()
  ctx.filter = 'blur(30px)'
  drawCover(ctx, img, -80, -80, W + 160, H + 160)
  ctx.restore()
  ctx.fillStyle = 'rgba(0,0,0,0.85)'
  ctx.fillRect(0, 0, W, H)

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

  dibujarTitulo(ctx, titulo)
  dibujarFooter(ctx)
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

export default function GenerarGIF({ plan, descripcion }: Props) {
  const fotos = [plan.foto_url, ...(plan.momentos_urls ?? [])].filter((u): u is string => Boolean(u))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 0 o 1 fotos → imagen estática de siempre.
  if (fotos.length < 2) {
    return <ShareStoryImage plan={plan} descripcion={descripcion ?? ''} />
  }

  const compartirODescargar = async (file: File, blob: Blob, filename: string) => {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: plan.titulo })
    } else {
      const u = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = u
      a.download = filename
      a.click()
      URL.revokeObjectURL(u)
    }
  }

  // Fallback fiable: collage estático (sin gif.js).
  const generarCollage = async (base64Fotos: string[]) => {
    console.log('[GIF] fallback → collage')
    const imgs = await Promise.all(base64Fotos.slice(0, 4).map(cargarImg))
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
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob del collage falló')), 'image/png')
    })
    await compartirODescargar(new File([blob], 'gooals-historia.png', { type: 'image/png' }), blob, 'gooals-historia.png')
    console.log('[GIF] collage compartido')
  }

  const intentarGIF = async (base64Fotos: string[]) => {
    if (document.fonts?.ready) await document.fonts.ready
    const { default: GIF } = await import('gif.js')
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: W,
      height: H,
      workerScript: window.location.origin + '/gif.worker.js',
      background: '#0A0A0A',
    })

    for (const b64 of base64Fotos) {
      const img = await cargarImg(b64)
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')!
      dibujarFrame(ctx, img, plan.titulo)
      gif.addFrame(canvas, { delay: 2000, copy: true })
    }
    console.log('[GIF] frames añadidos, renderizando...')

    const blob = await new Promise<Blob>((resolve, reject) => {
      gif.on('finished', resolve)
      gif.on('abort', () => reject(new Error('render abortado')))
      // Si el worker no arranca, render() nunca dispara 'finished': timeout de seguridad.
      const t = setTimeout(() => reject(new Error('timeout: el worker del GIF no respondió (30s)')), 30000)
      gif.on('finished', () => clearTimeout(t))
      gif.render()
    })
    await compartirODescargar(new File([blob], 'gooals-historia.gif', { type: 'image/gif' }), blob, 'gooals-historia.gif')
    console.log('[GIF] GIF compartido')
  }

  const generar = async () => {
    setLoading(true)
    setError('')
    console.log('[GIF] iniciando, fotos:', fotos.length)
    try {
      const base64Fotos: string[] = []
      for (const url of fotos) base64Fotos.push(await toBase64(url))
      console.log('[GIF] base64 cargadas:', base64Fotos.length)

      try {
        await intentarGIF(base64Fotos)
      } catch (gifErr) {
        // gif.js falló (worker, memoria…): caemos al collage, más fiable en móvil.
        console.error('[GIF] error completo:', gifErr)
        await generarCollage(base64Fotos)
      }
    } catch (err) {
      console.error('[GIF] error completo:', err)
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
          : <Film className="w-4 h-4 text-[#1DE9B6]" />
        }
        {loading ? 'Generando... puede tardar unos segundos' : 'Compartir historia'}
      </button>
      {error && <p className="text-sm text-[#C97B7B] mt-2 break-words">{error}</p>}
    </>
  )
}
