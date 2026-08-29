'use client'

import { useState, useMemo, useRef } from 'react'
import { X, ImagePlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { completarGooal, anadirYCompletarGooal } from '@/lib/actions'
import { DIFICULTAD_META, CATEGORIA_LABEL } from '@/lib/gooals'
import type { GooalV2 } from '@/types/gooals'

const BUCKET = 'gooals-media'
const MAX_SEGUNDOS_VIDEO = 9

export type ResultadoCompletado = {
  puntosGanados: number
  puntosTotales: number
  nivel: string
  subioDeNivel: boolean
}

type Props = {
  gooal: GooalV2
  /** 'lista' completa un gooal ya añadido; 'directo' lo añade y lo completa. */
  modo?: 'lista' | 'directo'
  onClose: () => void
  onCompletado: (resultado: ResultadoCompletado) => void
}

/** Reduce la foto a 1200px de ancho y JPEG 0.8 antes de subirla. */
function comprimirImagen(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1200
      let { width, height } = img
      if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('Canvas toBlob falló'))),
        'image/jpeg', 0.8
      )
    }
    img.onerror = () => reject(new Error('No se pudo leer la imagen'))
    img.src = url
  })
}

function duracionVideo(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    video.preload = 'metadata'
    video.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(video.duration) }
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer el vídeo')) }
    video.src = url
  })
}

export default function CompletarGooalModal({ gooal, modo = 'lista', onClose, onCompletado }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const inputRef = useRef<HTMLInputElement>(null)

  const [archivo, setArchivo] = useState<File | null>(null)
  const [esVideo, setEsVideo] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')

  const dificultad = DIFICULTAD_META[gooal.dificultad]

  const handleArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')

    const video = file.type.startsWith('video/')
    if (video) {
      try {
        const segundos = await duracionVideo(file)
        if (segundos > MAX_SEGUNDOS_VIDEO + 0.5) {
          setError(`El vídeo dura ${Math.round(segundos)}s. El máximo son ${MAX_SEGUNDOS_VIDEO}s.`)
          if (inputRef.current) inputRef.current.value = ''
          return
        }
      } catch {
        setError('No hemos podido leer ese vídeo. Prueba con otro.')
        return
      }
    }

    setArchivo(file)
    setEsVideo(video)
    setPreview(URL.createObjectURL(file))
  }

  const quitarArchivo = () => {
    if (preview) URL.revokeObjectURL(preview)
    setArchivo(null)
    setPreview(null)
    setEsVideo(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!archivo) return
    setSubiendo(true)
    setError('')

    try {
      // La subida va directa a Storage desde el navegador: un server action
      // tiene límite de tamaño de body y un vídeo de 9s se lo come.
      const extension = esVideo ? (archivo.name.split('.').pop() || 'mp4') : 'jpg'
      const cuerpo = esVideo ? archivo : await comprimirImagen(archivo)
      const ruta = `${gooal.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`

      const { error: upError } = await supabase.storage
        .from(BUCKET)
        .upload(ruta, cuerpo, { contentType: esVideo ? archivo.type : 'image/jpeg', upsert: false })

      if (upError) throw upError

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(ruta)

      const completar = modo === 'directo' ? anadirYCompletarGooal : completarGooal
      const res = await completar(
        gooal.id,
        esVideo ? null : publicUrl,
        esVideo ? publicUrl : null,
        descripcion.trim() || null
      )

      if (!res.success) throw new Error(res.error ?? 'No se pudo completar el gooal.')

      onCompletado({
        puntosGanados: res.puntosGanados ?? gooal.puntos,
        puntosTotales: res.puntosTotales ?? 0,
        nivel: res.nivel ?? 'Principiante',
        subioDeNivel: Boolean(res.subioDeNivel),
      })
    } catch (err) {
      console.error('[CompletarGooalModal]', err)
      const msg = err instanceof Error ? err.message : 'Error al subir la prueba'
      setError(`${msg} — comprueba que el bucket "${BUCKET}" existe y es público.`)
      setSubiendo(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && !subiendo && onClose()}
    >
      <div className="w-full bg-[#141414] rounded-t-2xl shadow-2xl max-h-[92vh] overflow-y-auto animate-[modal-slide-up_0.25s_ease-out]">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 bg-[#2A2A2A] rounded-full" />
        </div>

        <div className="px-5 py-3 flex items-center justify-between sticky top-0 bg-[#141414] border-b border-[#2A2A2A] z-10">
          <h2 className="font-semibold text-[#F0F0F0] text-base">¡Lo conseguiste!</h2>
          <button
            onClick={onClose}
            disabled={subiendo}
            aria-label="Cerrar"
            className="text-[#444444] active:text-[#F0F0F0] w-8 h-8 flex items-center justify-center rounded-lg active:bg-[#1A1A1A] transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pt-4 pb-5 space-y-4">
          <div className="rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[#666666] mb-1">
              {CATEGORIA_LABEL[gooal.categoria]} · {dificultad.emoji} {dificultad.label}
            </p>
            <p className="font-medium text-[#F0F0F0] text-sm">{gooal.titulo}</p>
          </div>

          <div>
            <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-1.5">
              Tu prueba
            </label>

            <div
              onClick={() => !subiendo && inputRef.current?.click()}
              className="w-full rounded-xl border border-dashed border-[#2A2A2A] cursor-pointer overflow-hidden"
              style={{ background: preview ? '#000' : '#1A1A1A' }}
            >
              {preview ? (
                esVideo ? (
                  <video src={preview} controls playsInline style={{ width: '100%', display: 'block' }} />
                ) : (
                  <img src={preview} alt="Vista previa" style={{ width: '100%', display: 'block' }} />
                )
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-[#444444]">
                  <ImagePlus className="w-8 h-8 mb-1.5" />
                  <p className="text-sm">Subir foto o vídeo</p>
                  <p className="text-xs text-[#1DE9B6]/70 mt-0.5">
                    Obligatorio · vídeo máx. {MAX_SEGUNDOS_VIDEO}s
                  </p>
                </div>
              )}
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleArchivo}
              style={{ display: 'none' }}
            />

            {archivo && (
              <button
                type="button"
                onClick={quitarArchivo}
                disabled={subiendo}
                className="mt-2 text-xs text-[#444444] active:text-[#666666] transition-colors min-h-[44px] flex items-center disabled:opacity-40"
              >
                Quitar
              </button>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-1.5">
              Cuéntanos cómo fue (opcional)
            </label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Lo que viviste, con quién, qué sentiste..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#1DE9B6] resize-none text-base"
            />
          </div>

          {error && (
            <p className="text-sm text-[#C97B7B] bg-[#8B3A3A]/20 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={subiendo}
              className="flex-1 py-3.5 rounded-xl border border-[#2A2A2A] text-[#666666] active:bg-[#1A1A1A] transition-colors text-sm font-medium min-h-[44px] disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={subiendo || !archivo}
              className="flex-[2] bg-[#1DE9B6] active:bg-[#00BFA5] disabled:opacity-30 disabled:cursor-not-allowed text-[#0A0A0A] py-3.5 rounded-xl transition-colors text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2"
            >
              {subiendo && (
                <span className="w-4 h-4 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
              )}
              {subiendo ? 'Subiendo...' : `Completar y ganar ${gooal.puntos} puntos`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
