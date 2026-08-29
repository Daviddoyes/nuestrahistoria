'use client'

import { useState, useMemo, useRef } from 'react'
import { X, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Avatar from './Avatar'

type Props = {
  userId: string
  nombreActual: string
  fotoActual: string | null
  onClose: () => void
  onGuardado: (cambios: { nombre: string; foto_perfil_url: string | null }) => void
}

/** Reduce el avatar a 800px y JPEG 0.85 antes de subirlo al bucket 'avatars'. */
function comprimirAvatar(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 800
      let { width, height } = img
      if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX }
      if (height > MAX) { width = Math.round((width * MAX) / height); height = MAX }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('Canvas toBlob falló'))),
        'image/jpeg', 0.85
      )
    }
    img.onerror = () => reject(new Error('No se pudo leer la imagen'))
    img.src = url
  })
}

export default function EditarPerfilModal({
  userId, nombreActual, fotoActual, onClose, onGuardado,
}: Props) {
  const supabase = useMemo(() => createClient(), [])
  const inputRef = useRef<HTMLInputElement>(null)

  const [nombre, setNombre] = useState(nombreActual)
  const [foto, setFoto] = useState<string | null>(fotoActual)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setArchivo(file)
    setFoto(URL.createObjectURL(file))
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) { setError('Escribe tu nombre.'); return }
    setGuardando(true)
    setError('')

    try {
      let fotoUrl = fotoActual

      if (archivo) {
        const comprimida = await comprimirAvatar(archivo)
        const ruta = `avatar-${userId}.jpg`
        const { error: upError } = await supabase.storage
          .from('avatars')
          .upload(ruta, comprimida, { upsert: true, contentType: 'image/jpeg' })
        if (upError) throw upError

        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(ruta)
        // El nombre de fichero es fijo, así que sin este parámetro el navegador
        // (y el CDN) seguirían sirviendo el avatar anterior.
        fotoUrl = `${publicUrl}?t=${Date.now()}`
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ nombre: nombre.trim(), foto_perfil_url: fotoUrl })
        .eq('id', userId)
      if (updateError) throw updateError

      onGuardado({ nombre: nombre.trim(), foto_perfil_url: fotoUrl })
    } catch (err) {
      console.error('[EditarPerfilModal]', err)
      setError('No hemos podido guardar los cambios. Inténtalo de nuevo.')
      setGuardando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && !guardando && onClose()}
    >
      <div className="w-full bg-[#141414] rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-[modal-slide-up_0.25s_ease-out]">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 bg-[#2A2A2A] rounded-full" />
        </div>

        <div className="px-5 py-3 flex items-center justify-between border-b border-[#2A2A2A]">
          <h2 className="font-semibold text-[#F0F0F0] text-base">Editar perfil</h2>
          <button
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar"
            className="text-[#444444] active:text-[#F0F0F0] w-8 h-8 flex items-center justify-center rounded-lg active:bg-[#1A1A1A] transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={guardar} className="px-5 pt-5 pb-5 space-y-5">
          <div className="flex justify-center">
            <div className="relative">
              <Avatar nombre={nombre || '?'} foto={foto} size={88} />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={guardando}
                aria-label="Cambiar foto"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#1DE9B6] border-2 border-[#141414] flex items-center justify-center text-[#0A0A0A] active:scale-90 transition-transform disabled:opacity-60"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleFoto}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-1.5">
              Tu nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              maxLength={60}
              placeholder="Escribe tu nombre"
              className="w-full px-4 py-3.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#1DE9B6] text-base"
            />
            {!nombre.trim() && (
              <p className="text-xs text-[#C97B7B] mt-1.5">El nombre no puede quedar vacío.</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-[#C97B7B] bg-[#8B3A3A]/20 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="flex-1 py-3.5 rounded-xl border border-[#2A2A2A] text-[#666666] active:bg-[#1A1A1A] transition-colors text-sm font-medium min-h-[44px] disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || !nombre.trim()}
              className="flex-1 bg-[#1DE9B6] active:bg-[#00BFA5] disabled:opacity-30 text-[#0A0A0A] py-3.5 rounded-xl transition-colors text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2"
            >
              {guardando && (
                <span className="w-4 h-4 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
              )}
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
