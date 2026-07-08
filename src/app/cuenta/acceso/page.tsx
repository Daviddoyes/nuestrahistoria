'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react'

type Subscription =
  | {
      active: true
      nombre: string | null
      plan: 'monthly' | 'yearly'
      currentPeriodEnd: number | null
      cancelAtPeriodEnd: boolean
    }
  | { active: false }

const labelClass = 'block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666]'

function formatDate(unix: number | null) {
  if (!unix) return '—'
  return new Date(unix * 1000).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function AccesoContent() {
  const params = useSearchParams()
  const token = params.get('token')

  const [state, setState] = useState<'loading' | 'valid' | 'invalid'>('loading')
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [error, setError] = useState('')
  const [portalLoading, setPortalLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/cuenta/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok || !data.valid) {
        setState('invalid')
        return
      }
      setSubscription(data.subscription)
      setState('valid')
    } catch {
      setState('invalid')
    }
  }, [token])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const handleManage = async () => {
    setPortalLoading(true)
    setError('')
    try {
      const res = await fetch('/api/subscription/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
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
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'No hemos podido cancelar la suscripción.')
        return
      }
      await loadStatus()
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
          <h1 className="font-serif text-2xl font-bold text-[#F0F0F0] tracking-tight">Tu cuenta</h1>
          <div className="h-px w-12 bg-[#E8692A] mt-3" />
        </div>

        {state === 'loading' && (
          <div className="flex items-center gap-2 text-sm text-[#666666]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Verificando enlace...
          </div>
        )}

        {state === 'invalid' && (
          <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-6 text-center">
            <ShieldAlert className="w-8 h-8 text-[#C97B7B] mx-auto mb-4" />
            <p className="text-sm text-[#999999] leading-relaxed">
              Este enlace no es válido o ha caducado. Los enlaces expiran a los 15 minutos por
              seguridad.
            </p>
            <Link
              href="/cuenta"
              className="inline-block mt-5 w-full bg-[#E8692A] active:bg-[#D4581A] text-white font-semibold py-3.5 rounded-xl transition-colors text-base"
            >
              Pedir un nuevo enlace
            </Link>
          </div>
        )}

        {state === 'valid' && subscription?.active && (
          <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <CheckCircle2 className="w-5 h-5 text-[#6BBF6B]" />
              <span className="text-sm font-semibold text-[#6BBF6B]">Suscripción activa</span>
            </div>

            <dl className="space-y-4">
              <div className="flex items-center justify-between">
                <dt className={labelClass}>Estado</dt>
                <dd className="text-sm font-medium text-[#F0F0F0]">
                  {subscription.cancelAtPeriodEnd ? 'Cancelación programada' : 'Activo'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className={labelClass}>Plan</dt>
                <dd className="text-sm font-medium text-[#F0F0F0]">
                  {subscription.plan === 'yearly' ? 'Anual' : 'Mensual'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className={labelClass}>
                  {subscription.cancelAtPeriodEnd ? 'Acceso hasta' : 'Próxima renovación'}
                </dt>
                <dd className="text-sm font-medium text-[#F0F0F0]">
                  {formatDate(subscription.currentPeriodEnd)}
                </dd>
              </div>
            </dl>

            {error && (
              <p className="mt-5 text-sm text-[#C97B7B] bg-[#8B3A3A]/20 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

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

              {!subscription.cancelAtPeriodEnd && (
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

        {state === 'valid' && subscription && !subscription.active && (
          <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-6 text-center">
            <p className="text-sm text-[#999999] leading-relaxed">
              No tienes ninguna suscripción activa en este momento.
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

export default function AccesoPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[#666666]" />
        </main>
      }
    >
      <AccesoContent />
    </Suspense>
  )
}
