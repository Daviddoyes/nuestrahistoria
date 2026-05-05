'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Users, ArrowRight } from 'lucide-react'
import { getMyProfile, vincularPareja } from '@/lib/actions'
import type { Profile } from '@/types/planes'

export default function OnboardingPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [codigoInput, setCodigoInput] = useState('')
  const [error, setError] = useState('')
  const [linking, setLinking] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const load = async () => {
      const p = await getMyProfile()
      if (!p) {
        router.push('/')
        return
      }
      if (p.pareja_id) {
        router.push('/planes')
        return
      }
      setProfile(p)
      setLoading(false)
    }
    load()
  }, [router])

  const handleCopiar = async () => {
    if (!profile) return
    await navigator.clipboard.writeText(profile.codigo_invitacion)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleVincular = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!codigoInput.trim()) {
      setError('Introduce el código de tu pareja')
      return
    }
    setLinking(true)
    setError('')
    try {
      await vincularPareja(codigoInput)
      router.push('/planes')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al vincular')
    } finally {
      setLinking(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#2A2A2A] border-t-[#C9B99A] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main
      className="min-h-screen bg-[#0A0A0A] flex flex-col justify-center px-6 py-10"
      style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top, 0px))' }}
    >
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-8">
          <div className="w-10 h-10 rounded-2xl bg-[#C9B99A]/10 flex items-center justify-center mb-4">
            <Users className="w-5 h-5 text-[#C9B99A]" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#F0F0F0] tracking-tight">
            Vincular pareja
          </h1>
          <p className="text-sm text-[#666666] mt-2">
            Comparte tu código o introduce el de tu pareja
          </p>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 mb-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-3">
            Tu código
          </p>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-2xl font-bold text-[#C9B99A] tracking-widest uppercase">
              {profile?.codigo_invitacion}
            </span>
            <button
              onClick={handleCopiar}
              className="flex items-center gap-1.5 text-xs text-[#666666] bg-[#2A2A2A] px-3 py-2 rounded-lg active:bg-[#3A3A3A] transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-[#C9B99A]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <p className="text-xs text-[#444444] mt-3">
            Comparte este código con tu pareja para vincularos
          </p>
        </div>

        <form onSubmit={handleVincular} className="space-y-4">
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-1.5">
              Código de tu pareja
            </label>
            <input
              type="text"
              value={codigoInput}
              onChange={e => setCodigoInput(e.target.value.toLowerCase())}
              placeholder="ej: a3b4c5d6"
              maxLength={8}
              className="w-full px-4 py-3.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#C9B99A] text-base font-mono tracking-widest"
            />
          </div>

          {error && (
            <p className="text-sm text-[#C97B7B] bg-[#8B3A3A]/20 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={linking}
            className="w-full bg-[#C9B99A] active:bg-[#B8A88A] disabled:opacity-40 disabled:cursor-not-allowed text-[#0A0A0A] font-semibold py-3.5 rounded-xl transition-colors text-base"
          >
            {linking ? 'Vinculando...' : 'Vincular pareja'}
          </button>
        </form>

        <button
          onClick={() => router.push('/planes')}
          className="w-full mt-4 flex items-center justify-center gap-2 text-sm text-[#444444] py-3 active:text-[#666666] transition-colors"
        >
          Continuar solo
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </main>
  )
}
