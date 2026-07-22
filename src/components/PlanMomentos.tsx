'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Camera, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { notificarNuevoMomento } from '@/lib/actions'
import type { PlanMomento } from '@/types/planes'

type Props = {
  planId: string
  currentUserId: string
  /** Solo los participantes (owner + aceptados) pueden subir fotos. */
  canUpload: boolean
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`)
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
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

export default function PlanMomentos({ planId, currentUserId, canUpload }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [momentos, setMomentos] = useState<PlanMomento[]>([])
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')
  const [ampliado, setAmpliado] = useState<PlanMomento | null>(null)

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from('plan_momentos')
      .select('*')
      .eq('plan_id', planId)
      .order('created_at', { ascending: true })
    setMomentos((data ?? []) as PlanMomento[])
  }, [planId, supabase])

  useEffect(() => { cargar() }, [cargar])

  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (fileInputRef.current) fileInputRef.current.value = ''

    setSubiendo(true)
    setError('')
    try {
      const compressed = await compressImage(file)
      const path = `momento-${Date.now()}.jpg`

      const { error: upError } = await supabase.storage
        .from('momentos')
        .upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
      if (upError) throw upError

      const { data: { publicUrl } } = supabase.storage.from('momentos').getPublicUrl(path)

      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre')
        .eq('id', currentUserId)
        .single()

      const { error: insertError } = await supabase.from('plan_momentos').insert({
        plan_id: planId,
        user_id: currentUserId,
        nombre_usuario: (profile as { nombre: string | null } | null)?.nombre ?? null,
        foto_url: publicUrl,
      })
      if (insertError) throw insertError

      await notificarNuevoMomento(planId)
      await cargar()
    } catch (err) {
      console.error('[momentos] upload failed:', err)
      setError('No se pudo subir la foto. Inténtalo otra vez.')
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[#666666]">
          {momentos.length === 0
            ? 'El proceso'
            : `${momentos.length} ${momentos.length === 1 ? 'foto' : 'fotos'} del proceso`}
        </p>

        {canUpload && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={subiendo}
            className="flex items-center gap-1.5 text-[13px] text-[#E8692A] active:text-[#D4581A] disabled:opacity-40 min-h-[44px]"
          >
            {subiendo
              ? <span className="w-3.5 h-3.5 border border-[#E8692A] border-t-transparent rounded-full animate-spin" />
              : <Camera className="w-3.5 h-3.5" />
            }
            {subiendo ? 'Subiendo...' : 'Añadir foto'}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFoto}
        style={{ display: 'none' }}
      />

      {error && (
        <p className="text-xs text-[#C97B7B] bg-[#8B3A3A]/20 px-3 py-2 rounded-lg mb-3">{error}</p>
      )}

      {momentos.length === 0 ? (
        <p className="text-xs text-[#444444] leading-relaxed">
          {canUpload
            ? 'Ve subiendo fotos del camino. Acabarán en tu historia.'
            : 'Todavía no hay fotos del proceso.'}
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
          {momentos.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setAmpliado(m)}
              style={{
                position: 'relative', aspectRatio: '1/1',
                overflow: 'hidden', background: '#1A1A1A',
                borderRadius: 6, display: 'block',
              }}
              className="active:opacity-70 transition-opacity"
            >
              <img
                src={m.foto_url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox — por encima del modal de detalle (z-50) y su botón de cerrar (z-60) */}
      {ampliado && (
        <div
          className="fixed inset-0 z-[70] bg-black/95 flex flex-col"
          onClick={e => e.target === e.currentTarget && setAmpliado(null)}
        >
          <button
            onClick={() => setAmpliado(null)}
            aria-label="Cerrar foto"
            className="absolute right-4 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white/60 active:text-white z-10"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex-1 flex items-center justify-center px-4">
            <img
              src={ampliado.foto_url}
              alt=""
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </div>

          <div
            className="px-6 pt-4"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
          >
            <p className="text-sm text-[#F0F0F0]">{ampliado.nombre_usuario ?? 'Usuario'}</p>
            <p className="text-[11px] text-[#666666] mt-0.5">{formatDate(ampliado.created_at)}</p>
            {ampliado.descripcion && (
              <p className="text-sm text-[#C0C0C0] mt-2 leading-relaxed">{ampliado.descripcion}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
