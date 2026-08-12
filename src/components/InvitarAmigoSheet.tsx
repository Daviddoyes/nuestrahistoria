'use client'

import { useState } from 'react'
import { X, Check } from 'lucide-react'

type Props = {
  onClose: () => void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function InvitarAmigoSheet({ onClose }: Props) {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviadoA, setEnviadoA] = useState<string | null>(null)
  const [error, setError] = useState('')

  const emailValido = EMAIL_RE.test(email.trim())
  // No marcamos en rojo mientras aún está escribiendo la primera parte.
  const mostrarInvalido = email.trim().length > 3 && !emailValido

  const handleEnviar = async () => {
    if (!emailValido || enviando) return
    const destino = email.trim().toLowerCase()

    setEnviando(true)
    setError('')
    try {
      const res = await fetch('/api/invitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: destino }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo enviar')

      setEnviadoA(destino)
      setEmail('')
    } catch (err) {
      console.error('[invitar] envío fallido:', err)
      setError('No se pudo enviar la invitación. Inténtalo otra vez.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      {/* Backdrop: toca fuera para cerrar */}
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} aria-hidden />

      {/* Bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invitar-amigo-titulo"
        className="fixed inset-x-0 bottom-0 z-[60] bg-[#0A0A0A] modal-slide-up"
        style={{
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          padding: '20px 24px',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 id="invitar-amigo-titulo" className="text-lg font-bold text-[#F0F0F0]">
              Invitar a un amigo
            </h2>
            <p className="text-[13px] text-[#666666] mt-1 leading-relaxed">
              Le llegará un email con tu invitación.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 -mr-2 flex items-center justify-center rounded-full text-[#555555] active:text-[#F0F0F0] transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {enviadoA ? (
          <div className="py-2">
            <div className="flex items-center gap-2.5 mb-5">
              <Check className="w-4 h-4 text-[#1DE9B6] flex-shrink-0" />
              <p className="text-sm text-[#F0F0F0] break-all">
                Invitación enviada a {enviadoA}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEnviadoA(null)}
                className="flex-1 py-3 rounded-xl border border-[#2A2A2A] text-[#666666] active:bg-[#1A1A1A] text-sm min-h-[44px] transition-colors"
              >
                Invitar a otro
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-[#1DE9B6] active:bg-[#00BFA5] text-[#0A0A0A] text-sm font-semibold min-h-[44px] transition-colors"
              >
                Listo
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={e => { e.preventDefault(); handleEnviar() }}
          >
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoFocus
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="email de tu amigo"
              aria-label="Email de tu amigo"
              aria-invalid={mostrarInvalido}
              className={`w-full px-4 py-3 rounded-xl border bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none text-sm transition-colors ${
                mostrarInvalido ? 'border-[#8B3A3A] focus:border-[#8B3A3A]' : 'border-[#2A2A2A] focus:border-[#1DE9B6]'
              }`}
            />

            {mostrarInvalido && (
              <p className="text-xs text-[#C97B7B] mt-2">Ese email no parece válido.</p>
            )}

            {error && (
              <p className="text-xs text-[#C97B7B] bg-[#8B3A3A]/20 px-3 py-2 rounded-lg mt-3">{error}</p>
            )}

            <button
              type="submit"
              disabled={!emailValido || enviando}
              className="w-full mt-4 py-3.5 rounded-xl bg-[#1DE9B6] active:bg-[#00BFA5] disabled:opacity-40 text-[#0A0A0A] text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2 transition-colors"
            >
              {enviando && (
                <span className="w-3.5 h-3.5 border border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
              )}
              {enviando ? 'Enviando...' : 'Enviar invitación'}
            </button>
          </form>
        )}
      </div>
    </>
  )
}
