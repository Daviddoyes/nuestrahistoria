'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
type Tab = 'login' | 'register'

export default function AuthPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('login')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [showForgot, setShowForgot] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError || !data.user) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('pareja_id, onboarding_completado')
      .eq('id', data.user.id)
      .single()

    if (profile?.onboarding_completado) {
      router.push('/perfil')
    } else {
      router.push('/onboarding')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) {
      setError('Escribe tu nombre')
      return
    }
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { nombre: nombre.trim() } },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('No se pudo crear la cuenta')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      nombre: nombre.trim(),
      email: email.trim(),
    })

    if (profileError) {
      setError('Revisa tu email para confirmar tu cuenta y vuelve a entrar.')
      setLoading(false)
      return
    }

    router.push('/onboarding')
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail.trim()) return
    setResetLoading(true)
    await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: 'https://livestory.app/auth/callback?next=/reset-password',
    })
    setResetLoading(false)
    setResetSent(true)
  }

  const inputClass =
    'w-full px-4 py-3.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#E8692A] text-base'
  const labelClass =
    'block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-1.5'

  return (
    <>
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
              Livestory
            </h1>
            <p className="text-sm text-[#666666] mt-2">Vive. Recuerda. Comparte.</p>
            <div className="h-px w-12 bg-[#E8692A] mt-3" />
          </div>

          <div className="flex gap-1 mb-8 bg-[#1A1A1A] p-1 rounded-xl">
            <button
              onClick={() => { setTab('login'); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'login' ? 'bg-[#E8692A] text-white' : 'text-[#666666]'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setTab('register'); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'register' ? 'bg-[#E8692A] text-white' : 'text-[#666666]'
              }`}
            >
              Crear cuenta
            </button>
          </div>

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
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

              <div>
                <label className={labelClass}>Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 bottom-0 px-4 text-[#444444] active:text-[#E8692A]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-[#C97B7B] bg-[#8B3A3A]/20 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors text-base mt-2"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>

              <button
                type="button"
                onClick={() => { setResetEmail(email); setResetSent(false); setShowForgot(true) }}
                className="w-full text-center text-xs text-[#666666] pt-1 active:text-[#E8692A] transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className={labelClass}>Tu nombre</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Escribe tu nombre"
                  autoComplete="name"
                  className={inputClass}
                />
              </div>

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

              <div>
                <label className={labelClass}>Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 bottom-0 px-4 text-[#444444] active:text-[#E8692A]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-[#C97B7B] bg-[#8B3A3A]/20 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors text-base mt-2"
              >
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </form>
          )}
        </div>

      </main>

      {/* Forgot password modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-sm bg-[#111111] border border-[#2A2A2A] rounded-t-2xl px-6 pt-6 pb-10 animate-[modal-slide-up_0.25s_ease-out]"
            style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-lg font-semibold text-[#F0F0F0]">
                Recuperar contraseña
              </h2>
              <button
                onClick={() => setShowForgot(false)}
                className="text-[#444444] active:text-[#E8692A] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetSent ? (
              <div className="bg-[#1A2A1A] border border-[#2A4A2A] rounded-xl px-4 py-4">
                <p className="text-sm text-[#6BBF6B] leading-relaxed">
                  Si el email existe recibirás un enlace en breve. Revisa también tu carpeta de spam.
                </p>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className={labelClass}>Tu email</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="tu@email.com"
                    autoComplete="email"
                    className={inputClass}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetLoading || !resetEmail.trim()}
                  className="w-full bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors text-base"
                >
                  {resetLoading ? 'Enviando...' : 'Enviar enlace'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
