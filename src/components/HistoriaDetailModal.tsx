'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Calendar, User, Pencil, Trash2, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Plan } from '@/types/planes'
import { updateHistoriaDescripcion, revertirHistoria } from '@/lib/actions'
import ShareStoryImage from './ShareStoryImage'

type Props = {
  plan: Plan
  onClose: () => void
  isOwner?: boolean
  onUpdate?: () => void
}

function formatDate(dateStr: string | null, fallback: string) {
  const str = dateStr ?? fallback
  const date = new Date(str.includes('T') ? str : `${str}T12:00:00`)
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function HistoriaDetailModal({ plan, onClose, isOwner, onUpdate }: Props) {
  const [closing, setClosing] = useState(false)
  const [descripcion, setDescripcion] = useState(plan.historia_descripcion ?? '')
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(descripcion)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Portada primero, después los momentos en orden cronológico.
  const fotos = useMemo(
    () => [plan.foto_url, ...(plan.momentos_urls ?? [])].filter((u): u is string => !!u),
    [plan.foto_url, plan.momentos_urls]
  )
  const esSlideshow = fotos.length > 1

  const [indice, setIndice] = useState(0)
  const [reproduciendo, setReproduciendo] = useState(true)

  useEffect(() => {
    if (!esSlideshow || !reproduciendo) return
    const id = setInterval(() => setIndice(i => (i + 1) % fotos.length), 2000)
    return () => clearInterval(id)
  }, [esSlideshow, reproduciendo, fotos.length])

  const irA = (i: number) => {
    setReproduciendo(false)
    setIndice((i + fotos.length) % fotos.length)
  }

  const close = () => {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, 260)
  }

  const handleEdit = () => {
    setEditText(descripcion)
    setSaveError('')
    setEditing(true)
  }

  const handleCancel = () => {
    setEditing(false)
    setSaveError('')
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await revertirHistoria(plan.id)
      onUpdate?.()
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    try {
      await updateHistoriaDescripcion(plan.id, editText)
      setDescripcion(editText)
      setEditing(false)
      onUpdate?.()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* X button — fixed, outside scroll, always visible */}
      <button
        onClick={close}
        aria-label="Cerrar"
        className="fixed right-4 z-[60] w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white/60 active:bg-black/70 active:text-white transition-colors"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <X className="w-4 h-4" />
      </button>

      {/* Single scroll container */}
      <div
        className={`fixed inset-0 z-50 bg-[#0A0A0A] ${closing ? 'modal-slide-down' : 'modal-slide-up'}`}
        style={{
          overflowY: 'scroll',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        } as React.CSSProperties}
      >
        {/* Slideshow si el plan acumuló momentos; si no, la portada a pelo */}
        {esSlideshow ? (
          <div style={{ position: 'relative', width: '100%', aspectRatio: '4/5', background: '#000', overflow: 'hidden' }}>
            {fotos.map((url, i) => (
              <img
                key={url}
                src={url}
                alt=""
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%', objectFit: 'cover',
                  opacity: i === indice ? 1 : 0,
                  transition: 'opacity 500ms ease',
                }}
              />
            ))}

            {/* Anterior / siguiente */}
            <button
              onClick={() => irA(indice - 1)}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 text-white/70 active:bg-black/60 active:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => irA(indice + 1)}
              aria-label="Foto siguiente"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 text-white/70 active:bg-black/60 active:text-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Pausa / play */}
            <button
              onClick={() => setReproduciendo(p => !p)}
              aria-label={reproduciendo ? 'Pausar' : 'Reproducir'}
              className="absolute left-3 bottom-3 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 text-white/70 active:bg-black/60 active:text-white"
            >
              {reproduciendo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            {/* Puntos */}
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-1.5 pointer-events-none">
              {fotos.map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: i === indice ? 16 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === indice ? '#E8692A' : 'rgba(255,255,255,0.45)',
                    transition: 'width 300ms ease, background 300ms ease',
                  }}
                />
              ))}
            </div>
          </div>
        ) : plan.foto_url ? (
          <div style={{ width: '100%', background: '#000' }}>
            <img
              src={plan.foto_url}
              alt={plan.titulo}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
        ) : (
          <div style={{ width: '100%', height: '50vw', background: '#111' }} />
        )}

        {/* Content */}
        <div
          className="px-6 pt-6"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)' }}
        >
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#E8692A] mb-3">
            Historia
          </p>

          <h2 className="font-serif text-2xl font-bold text-[#F0F0F0] leading-snug mb-5">
            {plan.titulo}
          </h2>

          <div className="flex flex-col gap-2 mb-6">
            <span className="flex items-center gap-2 text-[11px] text-[#666666] uppercase tracking-[0.1em]">
              <User className="w-3 h-3 flex-shrink-0" />
              {plan.creado_por}
            </span>
            <span className="flex items-center gap-2 text-[11px] text-[#666666] uppercase tracking-[0.1em]">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              {formatDate(plan.fecha_momento, plan.created_at)}
            </span>
          </div>

          <div className="h-px w-full bg-[#2A2A2A] mb-6" />

          {!editing && (
            <div className="mb-6">
              <ShareStoryImage plan={plan} descripcion={descripcion} />
            </div>
          )}

          {editing ? (
            <div className="space-y-3">
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                rows={6}
                autoFocus
                className="w-full px-4 py-3.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#E8692A] resize-none text-base leading-relaxed"
              />
              {saveError && (
                <p className="text-sm text-[#C97B7B] bg-[#8B3A3A]/20 px-3 py-2 rounded-lg">
                  {saveError}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3 rounded-xl border border-[#2A2A2A] text-[#666666] active:bg-[#1A1A1A] transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-40 text-white text-sm font-semibold transition-colors"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#666666] mb-2">
                El recuerdo
              </p>
              {descripcion ? (
                <p
                  style={{ fontSize: 16, lineHeight: 1.8, color: '#C0C0C0', paddingTop: 8 }}
                  className="pr-8"
                >
                  {descripcion}
                </p>
              ) : (
                <p
                  style={{ fontSize: 16, lineHeight: 1.8, color: '#444444', paddingTop: 8 }}
                  className="italic pr-8"
                >
                  Sin descripción.
                </p>
              )}
              {isOwner && (
                <button
                  onClick={handleEdit}
                  aria-label="Editar descripción"
                  className="absolute top-0 right-0 p-1 text-[#444444] active:text-[#E8692A] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          {isOwner && !editing && (
            <div className="mt-10 pt-6 border-t border-[#1A1A1A]">
              {confirmDelete ? (
                <div className="space-y-3">
                  <p className="text-sm text-[#C0C0C0] leading-relaxed">
                    ¿Eliminar esta historia? La foto y el recuerdo se perderán.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-3 rounded-xl border border-[#2A2A2A] text-[#666666] active:bg-[#1A1A1A] transition-colors text-sm font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-40 active:opacity-80"
                      style={{ background: '#8B3A3A' }}
                    >
                      {deleting ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-2 text-[#666666] active:text-[#C97B7B] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="text-sm">Eliminar historia</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
