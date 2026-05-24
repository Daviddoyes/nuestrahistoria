'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Users, ArrowRight, Link2 } from 'lucide-react'
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
      setError('Introduce el código de tu contacto')
      return
    }
    setLinking(true)
    setError('')
    try {
      await vincularPareja(codigoInput)
      const updated = await getMyProfile()
      setProfile(updated)
      setCodigoInput('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al vincular')
    } finally {
      setLinking(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#2A2A2A] border-t-[#E8692A] rounded-full animate-spin" />
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
          <div className="w-10 h-10 rounded-2xl bg-[#E8692A]/10 flex items-center justify-center mb-4">
            <Users className="w-5 h-5 text-[#E8692A]" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#F0F0F0] tracking-tight">
            {profile?.pareja_id ? 'Mi cuenta' : 'Conectar con alguien'}
          </h1>
          <p className="text-sm text-[#666666] mt-2">
            {profile?.pareja_id
              ? 'Ya tienes un contacto vinculado'
              : 'Comparte con quien quieras — pareja, amigos o familia'}
          </p>
        </div>

        {/* Invitation code — always visible */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 mb-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-3">
            Tu código
          </p>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-2xl font-bold text-[#E8692A] tracking-widest uppercase">
              {profile?.codigo_invitacion}
            </span>
            <button
              onClick={handleCopiar}
              className="flex items-center gap-1.5 text-xs text-[#666666] bg-[#2A2A2A] px-3 py-2 rounded-lg active:bg-[#3A3A3A] transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-[#E8692A]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <p className="text-xs text-[#444444] mt-3">
            Comparte este código para conectar con alguien
          </p>
        </div>

        {profile?.pareja_id ? (
          <>
            <div className="bg-[#1A2A1A] border border-[#2A4A2A] rounded-xl px-4 py-3 flex items-center gap-3 mb-6">
              <Link2 className="w-4 h-4 text-[#6BBF6B] shrink-0" />
              <p className="text-sm text-[#6BBF6B]">Contacto vinculado correctamente</p>
            </div>
            <button
              onClick={() => router.push('/planes')}
              className="w-full bg-[#E8692A] active:bg-[#D4581A] text-white font-semibold py-3.5 rounded-xl transition-colors text-base flex items-center justify-center gap-2"
            >
              Ir a mis planes
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <form onSubmit={handleVincular} className="space-y-4">
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-1.5">
                  Código de tu contacto
                </label>
                <input
                  type="text"
                  value={codigoInput}
                  onChange={e => setCodigoInput(e.target.value.toLowerCase())}
                  placeholder="ej: a3b4c5d6"
                  maxLength={8}
                  className="w-full px-4 py-3.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#E8692A] text-base font-mono tracking-widest"
                />
              </div>

              {error && (
                <p className="text-sm text-[#C97B7B] bg-[#8B3A3A]/20 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={linking}
                className="w-full bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors text-base"
              >
                {linking ? 'Conectando...' : 'Conectar'}
              </button>
            </form>

            <button
              onClick={() => router.push('/planes')}
              className="w-full mt-4 flex items-center justify-center gap-2 text-sm text-[#444444] py-3 active:text-[#666666] transition-colors"
            >
              Continuar solo
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </main>
  )
}
