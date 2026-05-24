'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Crown, Zap } from 'lucide-react'

const FREE_FEATURES = [
  '5 planes pendientes',
  'Historias ilimitadas',
  '1 contacto vinculado',
  'Fotos en las historias',
]

const PREMIUM_FEATURES = [
  'Planes ilimitados',
  'Historias ilimitadas',
  'IA para sugerir planes',
  'Compartir historias',
  'Soporte prioritario',
]

export default function PricingPage() {
  const router = useRouter()
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly')
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billing }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  return (
    <main
      className="min-h-screen bg-[#0A0A0A] px-5 py-10"
      style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top, 0px))' }}
    >
      <div className="w-full max-w-sm mx-auto">
        <button
          onClick={() => router.back()}
          className="text-[#666666] text-sm mb-8 active:text-[#E8692A] transition-colors"
        >
          ← Volver
        </button>

        <div className="mb-8">
          <h1 className="font-serif text-2xl font-bold text-[#F0F0F0] tracking-tight">
            Elige tu plan
          </h1>
          <p className="text-sm text-[#666666] mt-2">Empieza gratis, mejora cuando quieras</p>
        </div>

        <div className="flex gap-1 mb-6 bg-[#1A1A1A] p-1 rounded-xl">
          <button
            onClick={() => setBilling('monthly')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              billing === 'monthly' ? 'bg-[#E8692A] text-white' : 'text-[#666666]'
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors relative ${
              billing === 'yearly' ? 'bg-[#E8692A] text-white' : 'text-[#666666]'
            }`}
          >
            Anual
            <span className="absolute -top-2 -right-1 text-[9px] bg-[#4CAF50] text-white px-1.5 py-0.5 rounded-full font-semibold">
              -33%
            </span>
          </button>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-semibold text-[#F0F0F0] text-lg">Gratuito</h2>
              <p className="text-sm text-[#666666]">Para empezar</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#F0F0F0]">0€</p>
              <p className="text-xs text-[#666666]">para siempre</p>
            </div>
          </div>
          <ul className="space-y-2 mb-5">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-[#888888]">
                <Check className="w-4 h-4 text-[#E8692A] shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => router.push('/')}
            className="w-full border border-[#2A2A2A] text-[#666666] font-medium py-3 rounded-xl text-sm"
          >
            Empezar gratis
          </button>
        </div>

        <div className="bg-[#1A1A1A] border border-[#E8692A]/50 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-3 right-3">
            <span className="flex items-center gap-1 text-[10px] font-medium bg-[#E8692A] text-white px-2 py-1 rounded-full">
              <Crown className="w-3 h-3" />
              Popular
            </span>
          </div>

          <div className="mb-1 pr-20">
            <h2 className="font-semibold text-[#F0F0F0] text-lg">Premium</h2>
            <p className="text-sm text-[#666666]">Todo ilimitado, sin restricciones</p>
          </div>

          <div className="mb-4">
            {billing === 'monthly' ? (
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[#F0F0F0]">4,99€</span>
                <span className="text-[#666666] text-sm">/mes</span>
              </div>
            ) : (
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-[#F0F0F0]">39,99€</span>
                  <span className="text-[#666666] text-sm">/año</span>
                </div>
                <p className="text-xs text-[#4CAF50] mt-0.5">= 3,33€/mes — ahorras 20€</p>
              </div>
            )}
          </div>

          <ul className="space-y-2 mb-5">
            {PREMIUM_FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-[#F0F0F0]">
                <Check className="w-4 h-4 text-[#E8692A] shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" />
            {loading ? 'Redirigiendo...' : 'Hacerse Premium'}
          </button>
        </div>
      </div>
    </main>
  )
}
