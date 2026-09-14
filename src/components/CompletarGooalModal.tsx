'use client'

import { useState, useMemo, useRef, useEffect, useId } from 'react'
import { X, ImagePlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { completarGooal, anadirYCompletarGooal } from '@/lib/actions'
import { DIFICULTAD_META, CATEGORIA_LABEL } from '@/lib/gooals'
import type { GooalV2 } from '@/types/gooals'
import {
  ACCEPT_SELECTOR, BUCKET_PRUEBAS, MAX_BYTES_VIDEO, MAX_SEGUNDOS_VIDEO,
  errorDeArchivo, errorDeVideo, esHeic, mimeDeArchivo,
} from '@/lib/prueba-media'

const MEGA = 1024 * 1024

/**
 * Tope de espera para leer la duración de un vídeo. Si el navegador no entiende
 * el códec (un MOV en HEVC en Android, por ejemplo) no dispara ni
 * `loadedmetadata` ni `error`, y sin tope el usuario se quedaba mirando la
 * pantalla sin que pasara nada.
 */
const MS_LEER_VIDEO = 8000

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

/** La prueba ya lista para subir: la foto convertida a JPG, o el vídeo tal cual. */
type PruebaLista = {
  blob: Blob
  mime: string
  esVideo: boolean
  preview: string
}

/** Reduce la foto a 1200px de ancho y la guarda como JPEG 0.8. */
function comprimirImagen(file: Blob): Promise<Blob> {
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
      const contexto = canvas.getContext('2d')
      if (!contexto) { reject(new Error('Sin canvas')); return }
      contexto.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('Canvas toBlob falló'))),
        'image/jpeg', 0.8
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')) }
    img.src = url
  })
}

/**
 * Cualquier foto → JPG de 1.200 px.
 *
 * Primero se intenta con el propio navegador, que abre HEIC en Safari y todo lo
 * habitual en el resto. Solo si falla y la foto es HEIC/HEIF se descarga el
 * conversor (varios MB): así un iPhone, que ya entrega JPG, no se lo baja nunca.
 */
async function fotoAJpeg(file: File, mime: string): Promise<Blob> {
  try {
    return await comprimirImagen(file)
  } catch (errorNativo) {
    if (!esHeic(mime, file.name)) throw errorNativo
    const { heicTo } = await import('heic-to')
    const convertida = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 })
    return comprimirImagen(convertida)
  }
}

function duracionVideo(file: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    const terminar = () => { clearTimeout(tope); URL.revokeObjectURL(url) }
    const tope = setTimeout(() => { terminar(); reject(new Error('Tiempo agotado')) }, MS_LEER_VIDEO)
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.onloadedmetadata = () => { terminar(); resolve(video.duration) }
    video.onerror = () => { terminar(); reject(new Error('No se pudo leer el vídeo')) }
    video.src = url
  })
}

export default function CompletarGooalModal({ gooal, modo = 'lista', onClose, onCompletado }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const inputId = useId()

  const [prueba, setPrueba] = useState<PruebaLista | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [preparando, setPreparando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')

  const ocupado = preparando || subiendo
  const dificultad = DIFICULTAD_META[gooal.dificultad]

  // La URL de la vista previa ocupa memoria hasta que se libera.
  const previewActual = useRef<string | null>(null)
  useEffect(() => {
    previewActual.current = prueba?.preview ?? null
  }, [prueba])
  useEffect(() => () => {
    if (previewActual.current) URL.revokeObjectURL(previewActual.current)
  }, [])

  const cambiarPrueba = (nueva: PruebaLista | null) => {
    setPrueba(anterior => {
      if (anterior) URL.revokeObjectURL(anterior.preview)
      return nueva
    })
  }

  const handleArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Se vacía siempre: si no, volver a elegir el MISMO archivo tras un error no
    // dispara `change` y el toque se queda sin respuesta.
    e.target.value = ''
    if (!file) return

    setError('')
    setPreparando(true)
    const mime = mimeDeArchivo(file)

    try {
      if (mime.startsWith('image/') || esHeic(mime, file.name)) {
        let jpeg: Blob
        try {
          jpeg = await fotoAJpeg(file, mime)
        } catch {
          setError('No hemos podido abrir esa foto. Prueba con otra, o hazle una captura de pantalla y sube la captura.')
          return
        }
        const errorFoto = errorDeArchivo({ type: 'image/jpeg', size: jpeg.size })
        if (errorFoto) { setError(errorFoto); return }
        cambiarPrueba({ blob: jpeg, mime: 'image/jpeg', esVideo: false, preview: URL.createObjectURL(jpeg) })
        return
      }

      if (mime.startsWith('video/')) {
        const errorVideo = errorDeVideo(mime, file.size)
        if (errorVideo) { setError(errorVideo); return }

        let segundos: number
        try {
          segundos = await duracionVideo(file)
        } catch {
          setError('No hemos podido leer ese vídeo. Prueba con otro grabado con la cámara del móvil.')
          return
        }
        if (segundos > MAX_SEGUNDOS_VIDEO + 0.5) {
          setError(`El vídeo dura ${Math.round(segundos)}s. El máximo son ${MAX_SEGUNDOS_VIDEO}s.`)
          return
        }
        cambiarPrueba({ blob: file, mime, esVideo: true, preview: URL.createObjectURL(file) })
        return
      }

      setError('Eso no es una foto ni un vídeo. Elige una foto o un vídeo de tu galería.')
    } finally {
      setPreparando(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (ocupado) return
    if (!prueba) {
      setError('Primero añade una foto o un vídeo de tu prueba.')
      return
    }
    setSubiendo(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Tu sesión ha caducado. Vuelve a entrar para subir la prueba.')

      // La subida va directa a Storage desde el navegador: un server action
      // tiene límite de tamaño de body y un vídeo de 9s se lo come.
      // La carpeta <userId>/<gooalId>/ no es estética: la política del bucket
      // solo deja subir a tu propia carpeta, y el servidor rechaza cualquier
      // prueba que no esté en la del gooal que se completa.
      const extension = !prueba.esVideo ? 'jpg' : prueba.mime === 'video/quicktime' ? 'mov' : 'mp4'
      const ruta = `${user.id}/${gooal.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`

      const { error: upError } = await supabase.storage
        .from(BUCKET_PRUEBAS)
        .upload(ruta, prueba.blob, { contentType: prueba.mime, upsert: false })

      if (upError) throw new Error('No se pudo subir la prueba. Revisa tu conexión e inténtalo de nuevo.')

      const { data: { publicUrl } } = supabase.storage.from(BUCKET_PRUEBAS).getPublicUrl(ruta)

      const completar = modo === 'directo' ? anadirYCompletarGooal : completarGooal
      const res = await completar(
        gooal.id,
        prueba.esVideo ? null : publicUrl,
        prueba.esVideo ? publicUrl : null,
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
      setError(err instanceof Error ? err.message : 'No se pudo completar el gooal.')
      setSubiendo(false)
    }
  }

  return (
    // z-[75]: se abre también desde el detalle de Explorar, que ocupa la pantalla
    // en z-[60] (y su botón de cerrar en z-[70]). Con z-50 este modal quedaba
    // DEBAJO: el usuario pulsaba "Ya lo hice" y no veía nada. Por debajo de
    // CelebracionPuntos (z-[80]), que se abre al terminar.
    <div
      className="fixed inset-0 z-[75] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && !ocupado && onClose()}
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
            <p className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-1.5">
              Tu prueba
            </p>

            {/*
              El input no lleva display:none y se abre con un <label>, no con
              .click() desde JavaScript: es la activación nativa del navegador y
              la que menos depende de cada versión de Safari o Chrome.
            */}
            <input
              id={inputId}
              type="file"
              accept={ACCEPT_SELECTOR}
              onChange={handleArchivo}
              disabled={ocupado}
              className="sr-only"
            />

            {prueba ? (
              <div className="w-full rounded-xl overflow-hidden border border-[#2A2A2A]" style={{ background: '#000' }}>
                {prueba.esVideo ? (
                  <video src={prueba.preview} controls playsInline style={{ width: '100%', display: 'block' }} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- vista previa de un blob local, next/image no aplica
                  <img src={prueba.preview} alt="Vista previa de tu prueba" style={{ width: '100%', display: 'block' }} />
                )}
              </div>
            ) : (
              <label
                htmlFor={inputId}
                className="w-full rounded-xl border border-dashed border-[#2A2A2A] cursor-pointer flex flex-col items-center justify-center p-8 text-[#444444] active:bg-[#202020] transition-colors"
                style={{ background: '#1A1A1A' }}
              >
                {preparando ? (
                  <>
                    <span className="w-7 h-7 mb-2 border-2 border-[#2A2A2A] border-t-[#1DE9B6] rounded-full animate-spin" />
                    <p className="text-sm text-[#888888]">Preparando tu prueba...</p>
                  </>
                ) : (
                  <>
                    <ImagePlus className="w-8 h-8 mb-1.5" />
                    <p className="text-sm">Subir foto o vídeo</p>
                    <p className="text-xs text-[#1DE9B6]/70 mt-0.5 text-center">
                      Obligatorio · vídeo hasta {MAX_SEGUNDOS_VIDEO}s y {MAX_BYTES_VIDEO / MEGA} MB
                    </p>
                  </>
                )}
              </label>
            )}

            {/* El error va pegado a la zona de subida: al final del formulario
                quedaba fuera de la pantalla en móviles pequeños. */}
            {error && (
              <p role="alert" className="mt-2 text-sm text-[#C97B7B] bg-[#8B3A3A]/20 px-3 py-2 rounded-lg">{error}</p>
            )}

            {prueba && (
              <div className="mt-1 flex gap-4">
                <label
                  htmlFor={inputId}
                  className={`text-xs text-[#1DE9B6] active:text-[#00BFA5] transition-colors min-h-[44px] flex items-center cursor-pointer ${ocupado ? 'opacity-40' : ''}`}
                >
                  {preparando ? 'Preparando...' : 'Cambiar'}
                </label>
                <button
                  type="button"
                  onClick={() => { cambiarPrueba(null); setError('') }}
                  disabled={ocupado}
                  className="text-xs text-[#444444] active:text-[#666666] transition-colors min-h-[44px] flex items-center disabled:opacity-40"
                >
                  Quitar
                </button>
              </div>
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

          <div className="flex gap-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={subiendo}
              className="flex-1 py-3.5 rounded-xl border border-[#2A2A2A] text-[#666666] active:bg-[#1A1A1A] transition-colors text-sm font-medium min-h-[44px] disabled:opacity-40"
            >
              Cancelar
            </button>
            {/* Sin archivo NO se desactiva: al tocarlo explica qué falta. Solo se
                bloquea mientras hay trabajo en marcha, y entonces lo dice. */}
            <button
              type="submit"
              disabled={ocupado}
              className={`flex-[2] bg-[#1DE9B6] active:bg-[#00BFA5] disabled:opacity-60 text-[#0A0A0A] py-3.5 rounded-xl transition-colors text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2 ${prueba ? '' : 'opacity-50'}`}
            >
              {ocupado && (
                <span className="w-4 h-4 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
              )}
              {subiendo ? 'Subiendo...' : preparando ? 'Preparando...' : `Completar y ganar ${gooal.puntos} puntos`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
