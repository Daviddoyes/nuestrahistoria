'use client'

import { useState, useEffect, useCallback } from 'react'
import { Send, RefreshCw, AlertTriangle } from 'lucide-react'

type Estado = {
  pendientes: number
  porEstado: Record<string, number>
  configurado: boolean
  muestra: string[]
}

/** Fecha de hoy + n días, en el formato que espera un <input type="date">. */
function enDias(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export default function RelanzamientoSection() {
  const [estado, setEstado] = useState<Estado | null>(null)
  const [fecha, setFecha] = useState(enDias(10))
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [confirmando, setConfirmando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await fetch('/api/admin/relanzamiento')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error')
      setEstado(json)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No he podido cargar el estado')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const enviar = async (modo: 'prueba' | 'real') => {
    setEnviando(true)
    setError('')
    setAviso('')
    try {
      const res = await fetch('/api/admin/relanzamiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo, fechaBorrado: fecha }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error')

      setAviso(modo === 'prueba'
        ? `Prueba enviada a ${json.a}. Míralo antes de mandar el real.`
        : `Enviados ${json.enviados} correos.${json.nota ? ` ${json.nota}.` : ''}`)
      setConfirmando(false)
      cargar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido enviar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#7A8A85' }}>
          Correo a los usuarios existentes
        </p>
        <button onClick={cargar} aria-label="Recargar" style={{ padding: 6, color: '#7A8A85' }}>
          <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <p className="text-sm text-[#FF5252] bg-[rgba(255,82,82,0.14)] rounded-lg" style={{ padding: '9px 12px', marginBottom: 12 }}>
          {error}
        </p>
      )}
      {aviso && (
        <p className="text-sm text-[#00D1A7] bg-[#00D1A7]/10 rounded-lg" style={{ padding: '9px 12px', marginBottom: 12 }}>
          {aviso}
        </p>
      )}

      {cargando && !estado ? (
        <p style={{ fontSize: 13, color: '#7A8A85' }}>Cargando...</p>
      ) : estado && (
        <div style={{ background: '#1E2120', border: '1px solid #2A2E2C', borderRadius: 12, padding: 18 }}>
          {!estado.configurado && (
            <p className="flex items-start gap-2 text-sm text-[#FF5252]" style={{ marginBottom: 14 }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ marginTop: 2 }} />
              Falta <code>RESEND_API_KEY</code>. Sin ella no se puede enviar.
            </p>
          )}

          <div className="flex gap-8" style={{ marginBottom: 18 }}>
            <div>
              <p style={{ fontSize: 26, fontWeight: 700, color: '#00D1A7', lineHeight: 1 }}>
                {estado.pendientes}
              </p>
              <p style={{ fontSize: 11, color: '#7A8A85', marginTop: 5 }}>sin escribir</p>
            </div>
            <div>
              <p style={{ fontSize: 26, fontWeight: 700, color: '#7A8A85', lineHeight: 1 }}>
                {estado.porEstado.enviado ?? 0}
              </p>
              <p style={{ fontSize: 11, color: '#7A8A85', marginTop: 5 }}>ya enviados</p>
            </div>
          </div>

          <label style={{
            display: 'block', fontSize: 11, textTransform: 'uppercase',
            letterSpacing: '0.14em', color: '#7A8A85', marginBottom: 7,
          }}>
            Fecha de borrado que anuncia el correo
          </label>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="rounded-lg border border-[#2A2E2C] bg-[#0B0B0B] text-[#FFFFFF] focus:outline-none focus:border-[#00D1A7]"
            style={{ padding: '9px 11px', fontSize: 14, marginBottom: 6 }}
          />
          <p style={{ fontSize: 12, color: '#7A8A85', marginBottom: 18, lineHeight: 1.6 }}>
            Es la fecha a partir de la cual borras los planes y las historias.
            Deja margen para que a quien le importe le dé tiempo a escribirte.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => enviar('prueba')}
              disabled={enviando || !estado.configurado}
              className="flex items-center gap-2 rounded-lg active:opacity-80"
              style={{
                padding: '11px 16px', fontSize: 13, fontWeight: 500,
                color: '#00D1A7', border: '1px solid #2A2E2C',
                opacity: enviando || !estado.configurado ? 0.4 : 1,
              }}
            >
              <Send className="w-4 h-4" /> Enviarme una prueba
            </button>

            {!confirmando ? (
              <button
                onClick={() => setConfirmando(true)}
                disabled={enviando || !estado.configurado || estado.pendientes === 0}
                className="rounded-lg active:opacity-80"
                style={{
                  padding: '11px 16px', fontSize: 13, fontWeight: 600,
                  color: '#0B0B0B', background: '#00D1A7',
                  opacity: enviando || !estado.configurado || estado.pendientes === 0 ? 0.35 : 1,
                }}
              >
                Enviar a los {estado.pendientes}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 13, color: '#FF5252' }}>
                  Se manda a {estado.pendientes} personas y no se puede deshacer.
                </span>
                <button
                  onClick={() => enviar('real')}
                  disabled={enviando}
                  className="rounded-lg active:opacity-80"
                  style={{
                    padding: '11px 16px', fontSize: 13, fontWeight: 600,
                    color: '#0B0B0B', background: '#FF5252',
                  }}
                >
                  {enviando ? 'Enviando...' : 'Sí, enviar'}
                </button>
                <button
                  onClick={() => setConfirmando(false)}
                  style={{ fontSize: 13, color: '#7A8A85', padding: '11px 8px' }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {estado.muestra.length > 0 && (
            <p style={{ fontSize: 11, color: '#7A8A85', marginTop: 16, lineHeight: 1.6 }}>
              Primeros de la lista: {estado.muestra.join(', ')}
              {estado.pendientes > estado.muestra.length && ` y ${estado.pendientes - estado.muestra.length} más`}
            </p>
          )}
        </div>
      )}
    </>
  )
}
