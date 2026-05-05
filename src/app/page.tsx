'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
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
      .select('pareja_id')
      .eq('id', data.user.id)
      .single()

    router.push(profile?.pareja_id ? '/planes' : '/onboarding')
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
            Nuestra Historia
          </h1>
          <p className="text-sm text-[#666666] mt-2">Vuestra historia, vuestros planes</p>
          <div className="h-px w-12 bg-[#C9B99A] mt-3" />
        </div>

        <div className="flex gap-1 mb-8 bg-[#1A1A1A] p-1 rounded-xl">
          <button
            onClick={() => {
              setTab('login')
              setError('')
            }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'login' ? 'bg-[#C9B99A] text-[#0A0A0A]' : 'text-[#666666]'
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => {
              setTab('register')
              setError('')
            }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'register' ? 'bg-[#C9B99A] text-[#0A0A0A]' : 'text-[#666666]'
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
                  className="absolute right-0 top-0 bottom-0 px-4 text-[#444444] active:text-[#C9B99A]"
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
              className="w-full bg-[#C9B99A] active:bg-[#B8A88A] disabled:opacity-40 disabled:cursor-not-allowed text-[#0A0A0A] font-semibold py-3.5 rounded-xl transition-colors text-base mt-2"
            >
              {loading ? 'Entrando...' : 'Entrar'}
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
                  className="absolute right-0 top-0 bottom-0 px-4 text-[#444444] active:text-[#C9B99A]"
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
              className="w-full bg-[#C9B99A] active:bg-[#B8A88A] disabled:opacity-40 disabled:cursor-not-allowed text-[#0A0A0A] font-semibold py-3.5 rounded-xl transition-colors text-base mt-2"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
