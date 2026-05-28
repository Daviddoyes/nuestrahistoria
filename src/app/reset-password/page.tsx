'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const code = new URLSearchParams(window.location.search).get('code')

    if (code) {
      // PKCE flow: Supabase sent a ?code= param
      supabase.auth.exchangeCodeForSession(code).then(({ error: e }) => {
        if (!e) setReady(true)
        else setError('Link inválido o expirado')
      })
    } else {
      // Fallback: implicit flow with #access_token hash fragment
      const hash = window.location.hash
      if (hash.includes('access_token')) {
        const p = new URLSearchParams(hash.substring(1))
        const access_token = p.get('access_token')
        const refresh_token = p.get('refresh_token') ?? ''
        if (access_token) {
          supabase.auth
            .setSession({ access_token, refresh_token })
            .then(({ error: e }) => {
              if (!e) setReady(true)
              else setError('Link inválido o expirado')
            })
        }
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 6) { setError('Mínimo 6 caracteres'); return }

    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
    } else {
      setDone(true)
      setTimeout(() => router.push('/planes'), 1500)
    }
  }

  const inputClass =
    'w-full px-4 py-3.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#E8692A] text-base'
  const labelClass =
    'block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-1.5'

  return (
    <main
      className="min-h-screen bg-[#0A0A0A] flex flex-col justify-center px-6 py-10"
      style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top, 0px))' }}
    >
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-10">
          <div className="w-10 h-10 rounded-full bg-[#E8692A] flex items-center justify-center mb-4">
            <span className="text-white font-bold text-sm tracking-wide">LS</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#F0F0F0] tracking-tight">
            Nueva contraseña
          </h1>
          <p className="text-sm text-[#666666] mt-2">Elige una contraseña segura</p>
          <div className="h-px w-12 bg-[#E8692A] mt-3" />
        </div>

        {done ? (
          <div className="bg-[#1A2A1A] border border-[#2A4A2A] rounded-xl px-4 py-4">
            <p className="text-sm text-[#6BBF6B]">¡Contraseña actualizada! Redirigiendo...</p>
          </div>
        ) : !ready ? (
          <div className="flex flex-col items-center gap-4 pt-8">
            <div className="w-5 h-5 border-2 border-[#2A2A2A] border-t-[#E8692A] rounded-full animate-spin" />
            <p className="text-sm text-[#666666]">Verificando enlace...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={labelClass}>Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  className={`${inputClass} pr-12`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-0 top-0 bottom-0 px-4 text-[#444444] active:text-[#E8692A]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass}>Confirmar contraseña</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repite la contraseña"
                autoComplete="new-password"
                className={inputClass}
              />
            </div>

            {error && (
              <p className="text-sm text-[#C97B7B] bg-[#8B3A3A]/20 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors text-base"
            >
              {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
