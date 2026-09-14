'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { tomarDestinoPendiente } from '@/lib/redireccion'
import PantallaMarca from '@/components/PantallaMarca'
type Tab = 'login' | 'register'

export default function AuthPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Mientras se decide si hay sesión no se pinta el formulario: se vería un
  // instante antes de salir hacia el mapa.
  const [comprobando, setComprobando] = useState(true)

  /**
   * Quien ya tiene sesión no debe ver el login. Reglas, en este orden:
   *   1. mientras se comprueba, PantallaMarca (el render de abajo)
   *   2. sin sesión: el formulario, como siempre
   *   3. con sesión y ?invite=…: se queda aquí sin redirigir. Ese código aún no
   *      lo lee nadie, pero la puerta queda abierta para cuando se use
   *   4. con sesión y un destino pendiente válido: ahí, manda más que el mapa
   *   5. si no: /onboarding o /mapa según onboarding_completado
   */
  useEffect(() => {
    let vivo = true
    const mostrarFormulario = () => { if (vivo) setComprobando(false) }

    const decidir = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return mostrarFormulario()

        if (new URLSearchParams(window.location.search).get('invite')) return mostrarFormulario()

        const destino = tomarDestinoPendiente()
        if (destino) { router.replace(destino); return }

        const { data: perfil } = await supabase
          .from('profiles')
          .select('onboarding_completado')
          .eq('id', user.id)
          .single()

        // replace y no push: si no, "atrás" desde el mapa volvería aquí y
        // rebotaría otra vez hacia delante.
        router.replace(perfil?.onboarding_completado ? '/mapa' : '/onboarding')
      } catch (e) {
        // Si no se puede comprobar, el formulario: peor es quedarse en la pantalla de marca.
        console.error('[inicio] comprobando sesión:', e)
        mostrarFormulario()
      }
    }

    decidir()
    return () => { vivo = false }
  }, [supabase, router])

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError || !data.user) {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
      return
    }

    // Si iba a un sitio concreto antes de tener que entrar, se le devuelve ahí.
    // Validado: sin validar, este login servía para redirigir a otra web.
    const destino = tomarDestinoPendiente()
    if (destino) {
      router.push(destino)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('pareja_id, onboarding_completado')
      .eq('id', data.user.id)
      .single()

    if (profile?.onboarding_completado) {
      router.push('/mapa')
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
      setError('No hemos podido crear tu cuenta.')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      nombre: nombre.trim(),
      email: email.trim(),
    })

    if (profileError) {
      setError('Algo ha ido mal. Inténtalo de nuevo.')
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
      redirectTo: 'https://gooals.app/auth/callback?next=/reset-password',
    })
    setResetLoading(false)
    setResetSent(true)
  }

  const inputClass =
    'w-full px-4 py-3.5 rounded-xl border border-[#2A2E2C] bg-[#2A2E2C] text-[#FFFFFF] placeholder-[#7A8A85] focus:outline-none focus:border-[#00D1A7] text-base'
  const labelClass =
    'block text-[10px] font-medium uppercase tracking-[0.12em] text-[#7A8A85] mb-1.5'

  if (comprobando) return <PantallaMarca />

  return (
    <>
      <main
        className="min-h-screen bg-[#0B0B0B] flex flex-col justify-center px-6 py-10"
        style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="w-full max-w-sm mx-auto">
          <div className="mb-10">
            <div className="w-10 h-10 rounded-full bg-[#00D1A7] flex items-center justify-center mb-4">
              <span className="text-[#0B0B0B] font-bold text-sm tracking-wide">G</span>
            </div>
            <h1 className=" text-3xl font-bold text-[#FFFFFF] tracking-tight">
              GooALS
            </h1>
            <p className="text-sm text-[#7A8A85] mt-2">Convierte tus intenciones en recuerdos.</p>
            <div className="h-px w-12 bg-[#00D1A7] mt-3" />
          </div>

          <div className="flex gap-1 mb-8 bg-[#2A2E2C] p-1 rounded-xl">
            <button
              onClick={() => { setTab('login'); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'login' ? 'bg-[#00D1A7] text-[#0B0B0B]' : 'text-[#7A8A85]'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setTab('register'); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'register' ? 'bg-[#00D1A7] text-[#0B0B0B]' : 'text-[#7A8A85]'
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
                    className="absolute right-0 top-0 bottom-0 px-4 text-[#7A8A85] active:text-[#00D1A7]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-[#FF5252] bg-[rgba(255,82,82,0.14)] px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#00D1A7] active:bg-[#00B893] disabled:opacity-40 disabled:cursor-not-allowed text-[#0B0B0B] font-semibold py-3.5 rounded-xl transition-colors text-base mt-2"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>

              <button
                type="button"
                onClick={() => { setResetEmail(email); setResetSent(false); setShowForgot(true) }}
                className="w-full text-center text-xs text-[#7A8A85] pt-1 active:text-[#00D1A7] transition-colors"
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
                    className="absolute right-0 top-0 bottom-0 px-4 text-[#7A8A85] active:text-[#00D1A7]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-[#FF5252] bg-[rgba(255,82,82,0.14)] px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#00D1A7] active:bg-[#00B893] disabled:opacity-40 disabled:cursor-not-allowed text-[#0B0B0B] font-semibold py-3.5 rounded-xl transition-colors text-base mt-2"
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
            className="w-full max-w-sm bg-[#161817] border border-[#2A2E2C] rounded-t-2xl px-6 pt-6 pb-10 animate-[modal-slide-up_0.25s_ease-out]"
            style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className=" text-lg font-semibold text-[#FFFFFF]">
                Recuperar contraseña
              </h2>
              <button
                onClick={() => setShowForgot(false)}
                className="text-[#7A8A85] active:text-[#00D1A7] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetSent ? (
              <div className="bg-[rgba(0,209,167,0.08)] border border-[rgba(0,209,167,0.14)] rounded-xl px-4 py-4">
                <p className="text-sm text-[#00D1A7] leading-relaxed">
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
                  className="w-full bg-[#00D1A7] active:bg-[#00B893] disabled:opacity-40 disabled:cursor-not-allowed text-[#0B0B0B] font-semibold py-3.5 rounded-xl transition-colors text-base"
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
