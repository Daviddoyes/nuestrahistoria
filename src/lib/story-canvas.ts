// Utilidades de canvas para generar imágenes 1080×1920 de Stories.
// Solo se pueden importar desde componentes de cliente: usan DOM y canvas.

import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { CATEGORIA_ICONO, TRAZO_ICONO_CATEGORIA, type CategoriaGooal } from '@/lib/gooals'

export const STORY_W = 1080
export const STORY_H = 1920
export const ACENTO = '#00D1A7'

/**
 * El icono de una categoría como imagen para dibujarla en el canvas.
 *
 * El canvas no sabe pintar componentes: se renderiza el mismo icono de la app
 * en un div suelto, se lee su SVG y se carga como imagen. Así la Story lleva
 * exactamente el dibujo que se ve en pantalla, sin copiar sus trazados a mano.
 */
export async function iconoCategoriaImg(categoria: CategoriaGooal, color: string, lado: number): Promise<HTMLImageElement> {
  const contenedor = document.createElement('div')
  const raiz = createRoot(contenedor)
  flushSync(() => {
    raiz.render(createElement(CATEGORIA_ICONO[categoria], { size: lado, color, strokeWidth: TRAZO_ICONO_CATEGORIA }))
  })
  const svg = contenedor.innerHTML
  raiz.unmount()
  return cargarImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg))
}

/** Imagen remota → dataURL. Vía proxy para que el canvas no quede "tainted" por CORS. */
export async function aBase64(url: string): Promise<string> {
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

export function cargarImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
    img.src = src
  })
}

/** Equivalente a object-fit: cover dentro de la caja indicada. */
export function drawCover(
  ctx: CanvasRenderingContext2D, img: HTMLImageElement,
  x: number, y: number, w: number, h: number
) {
  const ir = img.width / img.height
  const br = w / h
  let sw = img.width, sh = img.height, sx = 0, sy = 0
  if (ir > br) { sw = img.height * br; sx = (img.width - sw) / 2 }
  else { sh = img.width / br; sy = (img.height - sh) / 2 }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

export function wrapText(
  ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines = 3
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w }
    else line = test
  }
  if (line) lines.push(line)
  return lines.slice(0, maxLines)
}

export function rectRedondeado(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Comparte el canvas por el share sheet del sistema. Si no está disponible o el
 * usuario cancela, descarga el PNG en silencio: cancelar no es un error.
 */
export async function compartirCanvas(canvas: HTMLCanvasElement, nombre: string, titulo: string) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob falló'))), 'image/png')
  })
  const file = new File([blob], nombre, { type: 'image/png' })
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: titulo })
      return
    }
  } catch {
    // Cae a la descarga.
  }
  descargar(blob, nombre)
}
