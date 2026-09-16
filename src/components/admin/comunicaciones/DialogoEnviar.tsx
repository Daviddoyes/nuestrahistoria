'use client'

import { useId, useState } from 'react'
import DialogoPanel from '@/components/admin/DialogoPanel'

const PALABRA = 'ENVIAR'

type Props = {
  titulo: string
  /** Qué va a pasar, con el grupo y la cifra exacta. */
  children: React.ReactNode
  /** null mientras se cuenta; 0 no deja confirmar. */
  personas: number | null
  ocupado: boolean
  error: string
  onConfirmar: (texto: string) => void
  onCancelar: () => void
}

/**
 * La última barrera antes de mandar correos de verdad. No es un "¿seguro?" con
 * un sí: hay que escribir ENVIAR a mano, que no se hace sin leer.
 *
 * El campo NO recibe el foco al abrir: en Android eso despliega el teclado, que
 * tapaba media pantalla y dejaba los botones fuera. El foco empieza en Cancelar.
 */
export default function DialogoEnviar({ titulo, children, personas, ocupado, error, onConfirmar, onCancelar }: Props) {
  const [texto, setTexto] = useState('')
  const idFormulario = useId()
  const idCampo = useId()

  // Mayúsculas exactas: "enviar" o "Enviar" no valen. Lo que no se escribe con intención, no pasa.
  const listo = texto === PALABRA && personas !== null && personas > 0 && !ocupado

  return (
    <DialogoPanel
      titulo={titulo}
      onCerrar={onCancelar}
      ocupado={ocupado}
      aviso={error ? (
        <p role="alert" style={{ marginBottom: 10, fontSize: 13, lineHeight: 1.5, color: '#FF5252', background: 'rgba(255,82,82,0.12)', borderRadius: 8, padding: '8px 10px' }}>{error}</p>
      ) : null}
      accion={
        <button
          type="submit"
          form={idFormulario}
          disabled={!listo}
          style={{
            flex: 1, minHeight: 46, borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, paddingInline: 10,
            background: listo || ocupado ? '#FF5252' : '#1E2120', color: listo || ocupado ? '#0B0B0B' : '#7A8A85',
            cursor: listo ? 'pointer' : 'not-allowed',
          }}
        >
          {ocupado && <span className="w-3.5 h-3.5 border-2 border-[#0B0B0B] border-t-transparent rounded-full animate-spin" />}
          {ocupado ? 'Enviando…' : personas ? `Enviar a ${personas.toLocaleString('es-ES')}` : 'Enviar'}
        </button>
      }
    >
      <div>{children}</div>

      <form id={idFormulario} onSubmit={e => { e.preventDefault(); if (listo) onConfirmar(texto) }} style={{ marginTop: 16 }}>
        <label htmlFor={idCampo} style={{ display: 'block', fontSize: 13, color: '#FFFFFF' }}>
          Escribe <strong style={{ color: '#FF5252', letterSpacing: '0.08em' }}>{PALABRA}</strong> para confirmar
        </label>
        <input
          id={idCampo}
          value={texto}
          onChange={e => setTexto(e.target.value)}
          disabled={ocupado}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="send"
          style={{ marginTop: 8, width: '100%', minHeight: 44, padding: '0 12px', borderRadius: 10, border: `1px solid ${texto === PALABRA ? '#FF5252' : '#2A2E2C'}`, background: '#0B0B0B', color: '#FFFFFF', fontSize: 16, letterSpacing: '0.08em' }}
        />
        {ocupado && <p style={{ marginTop: 8, fontSize: 12, color: '#FFD54F' }}>Enviando: no cierres esta página hasta que termine.</p>}
      </form>
    </DialogoPanel>
  )
}
