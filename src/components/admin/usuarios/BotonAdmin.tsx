'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import Confirmacion from '@/components/admin/catalogo/Confirmacion'
import { cambiarAdmin } from '@/app/admin/usuarios/acciones'

type Props = {
  userId: string
  nombre: string
  esAdmin: boolean
  /** La fila de quien mira: no puede quitarse el admin a sí mismo. */
  esUnoMismo: boolean
}

/** Marcar o desmarcar admin, siempre con confirmación: da acceso a los datos de todos. */
export default function BotonAdmin({ userId, nombre, esAdmin, esUnoMismo }: Props) {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')

  const aplicar = async () => {
    setOcupado(true)
    setError('')
    try {
      const r = await cambiarAdmin(userId, !esAdmin)
      if (!r.ok) setError(r.error)
      else router.refresh()
    } catch {
      setError('No se pudo guardar. Revisa la conexión.')
    } finally {
      setOcupado(false)
      setConfirmando(false)
    }
  }

  const bloqueado = esAdmin && esUnoMismo
  return (
    <div>
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        disabled={bloqueado || ocupado}
        title={bloqueado ? 'No puedes quitarte el admin a ti mismo' : undefined}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 34, padding: '0 10px', borderRadius: 8,
          fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', cursor: bloqueado ? 'not-allowed' : 'pointer',
          border: `1px solid ${esAdmin ? 'rgba(0,209,167,0.45)' : '#2A2E2C'}`,
          background: esAdmin ? 'rgba(0,209,167,0.12)' : 'transparent',
          color: esAdmin ? '#00D1A7' : '#A3B1AC',
          opacity: bloqueado ? 0.6 : 1,
        }}
      >
        {esAdmin && <ShieldCheck style={{ width: 13, height: 13 }} />}
        {esAdmin ? 'Admin' : 'Hacer admin'}
      </button>
      {error && <p role="alert" style={{ fontSize: 11, color: '#FF5252', marginTop: 4, maxWidth: 200 }}>{error}</p>}

      {confirmando && (
        <Confirmacion
          titulo={esAdmin ? 'Quitar el admin' : 'Hacer admin'}
          texto={esAdmin
            ? `${nombre} dejará de poder entrar al panel.`
            : `${nombre} podrá entrar al panel: ver el email de todos los usuarios, publicar gooals y dar admin a otros.`}
          confirmar={esAdmin ? 'Quitar admin' : 'Hacer admin'}
          peligro={!esAdmin}
          ocupado={ocupado}
          onConfirmar={aplicar}
          onCancelar={() => setConfirmando(false)}
        />
      )}
    </div>
  )
}
