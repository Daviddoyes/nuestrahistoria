// Utilidades de canvas para generar imágenes 1080×1920 de Stories.
// Solo se pueden importar desde componentes de cliente: usan DOM y canvas.

export const STORY_W = 1080
export const STORY_H = 1920
export const ACENTO = '#00D1A7'

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
