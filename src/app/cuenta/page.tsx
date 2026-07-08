'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'

type Status =
  | { active: true; nombre: string | null; plan: 'monthly' | 'yearly'; currentPeriodEnd: number | null; cancelAtPeriodEnd: boolean }
  | { active: false }

export default function CuentaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<Status | null>(null)

  const [portalLoading, setPortalLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  const inputClass =
    'w-full px-4 py-3.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#E8692A] text-base'
  const labelClass =
    'block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-1.5'

  const formatDate = (unix: number | null) => {
    if (!unix) return '—'
    return new Date(unix * 1000).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    setStatus(null)

    try {
      const res = await fetch('/api/subscription/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'No hemos podido consultar tu suscripción.')
        return
      }
      setStatus(data)
    } catch {
      setError('No hemos podido conectar. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleManage = async () => {
    setPortalLoading(true)
    setError('')
    try {
      const res = await fetch('/api/subscription/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error || 'No hemos podido abrir el portal.')
        setPortalLoading(false)
        return
      }
      window.location.href = data.url
    } catch {
      setError('No hemos podido conectar. Inténtalo de nuevo.')
      setPortalLoading(false)
    }
  }

  const handleCancel = async () => {
    const ok = window.confirm(
      '¿Seguro que quieres cancelar tu suscripción? Mantendrás el acceso hasta tu próxima fecha de renovación.'
    )
    if (!ok) return

    setCancelLoading(true)
    setError('')
    try {
      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'No hemos podido cancelar la suscripción.')
        return
      }
      // Re-fetch so the UI reflects the pending cancellation.
      await handleLookup({ preventDefault() {} } as React.FormEvent)
    } catch {
      setError('No hemos podido conectar. Inténtalo de nuevo.')
    } finally {
      setCancelLoading(false)
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
            Introduce tu email para consultar y gestionar tu suscripción.
          </p>
          <div className="h-px w-12 bg-[#E8692A] mt-3" />
        </div>

        <form onSubmit={handleLookup} className="space-y-5">
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value)
                setStatus(null)
              }}
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
                Consultando...
              </>
            ) : (
              'Consultar suscripción'
            )}
          </button>
        </form>

        {status?.active && (
          <div className="mt-8 bg-[#111111] border border-[#2A2A2A] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <CheckCircle2 className="w-5 h-5 text-[#6BBF6B]" />
              <span className="text-sm font-semibold text-[#6BBF6B]">Suscripción activa</span>
            </div>

            <dl className="space-y-4">
              <div className="flex items-center justify-between">
                <dt className={labelClass + ' mb-0'}>Estado</dt>
                <dd className="text-sm font-medium text-[#F0F0F0]">
                  {status.cancelAtPeriodEnd ? 'Cancelación programada' : 'Activo'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className={labelClass + ' mb-0'}>Plan</dt>
                <dd className="text-sm font-medium text-[#F0F0F0]">
                  {status.plan === 'yearly' ? 'Anual' : 'Mensual'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className={labelClass + ' mb-0'}>
                  {status.cancelAtPeriodEnd ? 'Acceso hasta' : 'Próxima renovación'}
                </dt>
                <dd className="text-sm font-medium text-[#F0F0F0]">
                  {formatDate(status.currentPeriodEnd)}
                </dd>
              </div>
            </dl>

            <div className="mt-6 space-y-3">
              <button
                onClick={handleManage}
                disabled={portalLoading}
                className="w-full bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl transition-colors text-base flex items-center justify-center gap-2"
              >
                {portalLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Abriendo portal...
                  </>
                ) : (
                  'Gestionar suscripción'
                )}
              </button>

              {!status.cancelAtPeriodEnd && (
                <button
                  onClick={handleCancel}
                  disabled={cancelLoading}
                  className="w-full border border-[#2A2A2A] active:border-[#8B3A3A] disabled:opacity-40 text-[#C97B7B] font-medium py-3.5 rounded-xl transition-colors text-base flex items-center justify-center gap-2"
                >
                  {cancelLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelando...
                    </>
                  ) : (
                    'Cancelar suscripción'
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {status && !status.active && (
          <div className="mt-8 bg-[#111111] border border-[#2A2A2A] rounded-2xl p-6 text-center">
            <p className="text-sm text-[#999999] leading-relaxed">
              No encontramos ninguna suscripción activa con ese email.
            </p>
            <Link
              href="/suscripcion"
              className="inline-block mt-5 w-full bg-[#E8692A] active:bg-[#D4581A] text-white font-semibold py-3.5 rounded-xl transition-colors text-base"
            >
              Ver planes de suscripción
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
