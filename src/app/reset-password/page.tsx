'use client'

import { useState, useEffect } from 'react'
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

  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    setError('')

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setDone(true)
    setTimeout(() => router.push('/planes'), 2000)
  }

  const inputClass =
    'w-full px-4 py-3.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#C9B99A] text-base'
  const labelClass =
    'block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-1.5'

  return (
    <main
      className="min-h-screen bg-[#0A0A0A] flex flex-col justify-center px-6 py-10"
      style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top, 0px))' }}
    >
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-10">
          <h1 className="font-serif text-3xl font-bold text-[#F0F0F0] tracking-tight">
            Nueva contraseña
          </h1>
          <p className="text-sm text-[#666666] mt-2">Elige una contraseña segura</p>
          <div className="h-px w-12 bg-[#C9B99A] mt-3" />
        </div>

        {done ? (
          <div className="bg-[#1A2A1A] border border-[#2A4A2A] rounded-xl px-4 py-4">
            <p className="text-sm text-[#6BBF6B]">
              ¡Contraseña actualizada! Redirigiendo...
            </p>
          </div>
        ) : !ready ? (
          <div className="flex flex-col items-center gap-4 pt-8">
            <div className="w-5 h-5 border-2 border-[#2A2A2A] border-t-[#C9B99A] rounded-full animate-spin" />
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
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 bottom-0 px-4 text-[#444444] active:text-[#C9B99A]"
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
              className="w-full bg-[#C9B99A] active:bg-[#B8A88A] disabled:opacity-40 disabled:cursor-not-allowed text-[#0A0A0A] font-semibold py-3.5 rounded-xl transition-colors text-base mt-2"
            >
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
