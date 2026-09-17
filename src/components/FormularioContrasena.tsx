'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { cambiarContrasena } from '@/app/reset-password/acciones'
import Diana from '@/components/Diana'

const MINIMO = 6

/** El formulario de contraseña nueva. Quien decide si se pinta es la página, en el servidor. */
export default function FormularioContrasena() {
  const router = useRouter()
  const [contrasena, setContrasena] = useState('')
  const [repetida, setRepetida] = useState('')
  const [verContrasena, setVerContrasena] = useState(false)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [hecho, setHecho] = useState(false)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (contrasena !== repetida) { setError('Las contraseñas no coinciden.'); return }
    if (contrasena.length < MINIMO) { setError(`Mínimo ${MINIMO} caracteres.`); return }

    setGuardando(true)
    setError('')
    try {
      const r = await cambiarContrasena(contrasena)
      if (!r.ok) { setError(r.error); return }
      setHecho(true)
      // La sesión ya está abierta con la contraseña nueva: se entra directo.
      setTimeout(() => router.replace('/mapa'), 1500)
    } catch {
      setError('No se ha podido guardar. Revisa la conexión e inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  const inputClass =
    'w-full px-4 py-3.5 rounded-xl border border-[#2A2E2C] bg-[#2A2E2C] text-[#FFFFFF] placeholder-[#7A8A85] focus:outline-none focus:border-[#00D1A7] text-base'
  const labelClass =
    'block text-[10px] font-medium uppercase tracking-[0.12em] text-[#7A8A85] mb-1.5'

  return (
    <main
      className="min-h-screen bg-[#0B0B0B] flex flex-col justify-center px-6 py-10"
      style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top, 0px))' }}
    >
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-10">
          <div className="mb-4"><Diana tamano={40} /></div>
          <h1 className="fuente-titular text-3xl font-bold text-[#FFFFFF] tracking-tight">Nueva contraseña</h1>
          <p className="text-sm text-[#7A8A85] mt-2">Elige una contraseña segura.</p>
          <div className="h-px w-12 bg-[#00D1A7] mt-3" />
        </div>

        {hecho ? (
          <div className="bg-[rgba(0,209,167,0.08)] border border-[rgba(0,209,167,0.14)] rounded-xl px-4 py-4">
            <p className="text-sm text-[#00D1A7]">¡Contraseña actualizada! Entrando…</p>
            <p className="text-xs text-[#7A8A85] mt-2" style={{ lineHeight: 1.6 }}>
              Las demás sesiones de tu cuenta se han cerrado: en otros dispositivos habrá que entrar otra vez.
            </p>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-5">
            <div>
              <label className={labelClass} htmlFor="contrasena">Nueva contraseña</label>
              <div className="relative">
                <input
                  id="contrasena"
                  type={verContrasena ? 'text' : 'password'}
                  value={contrasena}
                  onChange={e => setContrasena(e.target.value)}
                  placeholder={`Mínimo ${MINIMO} caracteres`}
                  autoComplete="new-password"
                  className={`${inputClass} pr-12`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setVerContrasena(v => !v)}
                  aria-label={verContrasena ? 'Ocultar la contraseña' : 'Ver la contraseña'}
                  className="absolute right-0 top-0 bottom-0 px-4 text-[#7A8A85] active:text-[#00D1A7]"
                >
                  {verContrasena ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="repetida">Confirmar contraseña</label>
              <input
                id="repetida"
                type={verContrasena ? 'text' : 'password'}
                value={repetida}
                onChange={e => setRepetida(e.target.value)}
                placeholder="Repite la contraseña"
                autoComplete="new-password"
                className={inputClass}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-[#FF5252] bg-[rgba(255,82,82,0.14)] px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={guardando}
              className="w-full bg-[#00D1A7] active:bg-[#00B893] disabled:opacity-40 text-[#0B0B0B] font-semibold py-3.5 rounded-xl transition-colors text-base"
            >
              {guardando ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
