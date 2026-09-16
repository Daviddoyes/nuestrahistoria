'use client'

import DialogoPanel from '@/components/admin/DialogoPanel'

type Props = {
  titulo: string
  texto: string
  confirmar: string
  /** Rojo en vez de turquesa: para borrar o descartar. */
  peligro?: boolean
  ocupado?: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

/**
 * Confirmación antes de una acción que no conviene hacer sin querer (borrar un
 * gooal, dar o quitar admin, verificar en bloque...).
 *
 * El foco empieza en Cancelar y no en el botón de confirmar, como hacía antes:
 * un Intro pulsado sin mirar ya no borra nada.
 */
export default function Confirmacion({ titulo, texto, confirmar, peligro, ocupado, onConfirmar, onCancelar }: Props) {
  const color = peligro ? '#FF5252' : '#00D1A7'
  return (
    <DialogoPanel
      titulo={titulo}
      onCerrar={onCancelar}
      ocupado={ocupado}
      ancho={400}
      accion={
        <button
          type="button"
          onClick={onConfirmar}
          disabled={ocupado}
          style={{
            flex: 1, minHeight: 46, borderRadius: 10, border: 'none', background: color, paddingInline: 10,
            color: '#0B0B0B', fontSize: 14, fontWeight: 700, opacity: ocupado ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {ocupado && <span className="w-4 h-4 border-2 border-[#0B0B0B] border-t-transparent rounded-full animate-spin" />}
          {confirmar}
        </button>
      }
    >
      <p>{texto}</p>
    </DialogoPanel>
  )
}
