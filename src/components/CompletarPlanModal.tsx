'use client'

import { useState, useRef } from 'react'
import { X, ImagePlus } from 'lucide-react'
import type { Plan } from '@/types/planes'

type Props = {
  plan: Plan
  onClose: () => void
  onSubmit: (id: string, descripcion: string, fotoUrl: string | null, fechaMomento: string | null) => Promise<void>
}

export default function CompletarPlanModal({ plan, onClose, onSubmit }: Props) {
  const [descripcion, setDescripcion] = useState('')
  const [fechaMomento, setFechaMomento] = useState(() => new Date().toISOString().split('T')[0])
  const [foto, setFoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFoto(file)
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const compressImage = (file: File): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const MAX = 1200
        let { width, height } = img
        if (width > MAX) {
          height = Math.round((height * MAX) / width)
          width = MAX
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          blob => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
          'image/jpeg',
          0.8
        )
      }
      img.onerror = reject
      img.src = url
    })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      let fotoUrl: string | null = null
      if (foto) {
        const compressed = await compressImage(foto)
        console.log('[upload] original size:', foto.size, 'compressed size:', compressed.size)

        const fd = new FormData()
        fd.append('file', new File([compressed], 'foto.jpg', { type: 'image/jpeg' }))

        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const json = await res.json()

        if (!res.ok || json.error) {
          console.error('[upload] api error:', json.error)
          throw new Error(json.error ?? 'Error al subir la foto')
        }

        fotoUrl = json.publicUrl
        console.log('[upload] publicUrl:', fotoUrl)
      }
      await onSubmit(plan.id, descripcion, fotoUrl, fechaMomento || null)
    } catch (err) {
      console.error('[CompletarPlanModal]', err)
      const msg = err instanceof Error ? err.message : 'Error al subir la foto'
      setError(`${msg} — verifica que el bucket "fotos" existe y es público.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full bg-[#141414] rounded-t-2xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 bg-[#2A2A2A] rounded-full" />
        </div>

        <div className="px-5 py-3 flex items-center justify-between sticky top-0 bg-[#141414] border-b border-[#2A2A2A]">
          <h2 className="font-serif font-semibold text-[#F0F0F0] text-base">Completar plan</h2>
          <button
            onClick={onClose}
            className="text-[#444444] active:text-[#F0F0F0] w-8 h-8 flex items-center justify-center rounded-lg active:bg-[#1A1A1A] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pt-4 pb-5 space-y-4">
          <div className="rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[#666666] mb-0.5">Plan</p>
            <p className="font-medium text-[#F0F0F0] text-sm">{plan.titulo}</p>
          </div>

          <div>
            <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-1.5">
              Foto del recuerdo
            </label>

            {/* Photo picker */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-xl border border-dashed border-[#2A2A2A] cursor-pointer overflow-hidden"
              style={{ background: preview ? '#000' : '#1A1A1A' }}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  style={{ width: '100%', height: 'auto', objectFit: 'contain', display: 'block' }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-[#444444]">
                  <ImagePlus className="w-8 h-8 mb-1.5" />
                  <p className="text-sm">Seleccionar foto</p>
                  <p className="text-xs text-[#E8692A]/70 mt-0.5">Obligatoria</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFotoChange}
              className="hidden"
            />
            {foto && (
              <button
                type="button"
                onClick={() => { setFoto(null); setPreview(null) }}
                className="mt-2 text-xs text-[#444444] active:text-[#666666] transition-colors min-h-[44px] flex items-center"
              >
                Quitar foto
              </button>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-1.5">
              Como fue
            </label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Describe el recuerdo..."
              rows={4}
              className="w-full px-4 py-3.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#E8692A] resize-none text-base"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-1.5">
              ¿Cuándo ocurrió?
            </label>
            <input
              type="date"
              value={fechaMomento}
              onChange={e => setFechaMomento(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              style={{ colorScheme: 'dark' }}
              className="w-full px-4 py-3.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] focus:outline-none focus:border-[#E8692A] text-base"
            />
          </div>

          {error && (
            <p className="text-sm text-[#C97B7B] bg-[#8B3A3A]/20 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div
            className="flex gap-3"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl border border-[#2A2A2A] text-[#666666] active:bg-[#1A1A1A] transition-colors text-sm font-medium min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !foto}
              className="flex-1 bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-30 disabled:cursor-not-allowed text-white py-3.5 rounded-xl transition-colors text-sm font-semibold min-h-[44px]"
            >
              {loading ? 'Subiendo...' : 'Guardar historia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
