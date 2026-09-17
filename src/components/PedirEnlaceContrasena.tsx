'use client'

import { useState } from 'react'

type Props = {
  /** Se rellena solo cuando ya sabemos el email (por ejemplo, desde la pantalla de entrar). */
  emailInicial?: string
  onHecho?: () => void
}

/**
 * Pide el correo para cambiar la contraseña.
 *
 * Responde lo mismo exista la cuenta o no: si dijera "ese email no está
 * registrado", cualquiera podría usar esto para averiguar quién tiene cuenta.
 */
export default function PedirEnlaceContrasena({ emailInicial = '', onHecho }: Props) {
  const [email, setEmail] = useState(emailInicial)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setEnviando(true)
    setError('')
    try {
      const res = await fetch('/api/recuperar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'No se ha podido enviar.')
      setEnviado(true)
      onHecho?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido enviar. Revisa la conexión.')
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <div style={{ background: 'rgba(0,209,167,0.08)', border: '1px solid rgba(0,209,167,0.2)', borderRadius: 12, padding: 16 }}>
        <p style={{ fontSize: 14, color: '#00D1A7', lineHeight: 1.6 }}>
          Si hay una cuenta con ese email, te llega un correo con un enlace para elegir contraseña nueva.
        </p>
        <p style={{ fontSize: 13, color: '#7A8A85', marginTop: 8, lineHeight: 1.6 }}>
          Míralo también en la carpeta de spam. El enlace dura una hora y solo sirve una vez.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="tu@email.com"
        aria-label="Tu email"
        autoComplete="email"
        required
        className="w-full px-4 py-3.5 rounded-xl border border-[#2A2E2C] bg-[#2A2E2C] text-[#FFFFFF] placeholder-[#7A8A85] focus:outline-none focus:border-[#00D1A7] text-base"
      />
      {error && (
        <p role="alert" style={{ fontSize: 13, color: '#FF5252', background: 'rgba(255,82,82,0.14)', borderRadius: 8, padding: '8px 10px' }}>{error}</p>
      )}
      <button
        type="submit"
        disabled={enviando || !email.trim()}
        className="w-full bg-[#00D1A7] active:bg-[#00B893] disabled:opacity-40 text-[#0B0B0B] font-semibold py-3.5 rounded-xl text-base"
      >
        {enviando ? 'Enviando…' : 'Enviarme el enlace'}
      </button>
    </form>
  )
}
