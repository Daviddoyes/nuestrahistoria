'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'

export default function CuentaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const inputClass =
    'w-full px-4 py-3.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#E8692A] text-base'
  const labelClass =
    'block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-1.5'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/cuenta/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'No hemos podido enviar el enlace.')
        return
      }
      setSent(true)
    } catch {
      setError('No hemos podido conectar. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="min-h-screen bg-[#0A0A0A] flex flex-col justify-center px-6 py-10"
      style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top, 0px))' }}
    >
      <div className="w-full max-w-sm mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#666666] active:text-[#E8692A] transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver
        </Link>

        <div className="mb-8">
          <h1 className="font-serif text-2xl font-bold text-[#F0F0F0] tracking-tight">
            Gestiona tu suscripción
          </h1>
          <p className="text-sm text-[#666666] mt-2">
            Introduce tu email y te enviaremos un enlace seguro para acceder a tu cuenta.
          </p>
          <div className="h-px w-12 bg-[#E8692A] mt-3" />
        </div>

        {sent ? (
          <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <MailCheck className="w-5 h-5 text-[#6BBF6B]" />
              <span className="text-sm font-semibold text-[#F0F0F0]">Revisa tu email</span>
            </div>
            <p className="text-sm text-[#999999] leading-relaxed">
              Si <span className="text-[#F0F0F0]">{email.trim()}</span> tiene una cuenta, te hemos
              enviado un enlace de acceso. Caduca en 15 minutos. Revisa también tu carpeta de spam.
            </p>
            <button
              onClick={() => {
                setSent(false)
                setError('')
              }}
              className="mt-5 w-full text-center text-xs text-[#666666] active:text-[#E8692A] transition-colors"
            >
              Usar otro email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                className={inputClass}
              />
            </div>

            {error && (
              <p className="text-sm text-[#C97B7B] bg-[#8B3A3A]/20 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors text-base flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando enlace...
                </>
              ) : (
                'Enviar enlace de acceso'
              )}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
