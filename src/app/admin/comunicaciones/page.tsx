import { Mail } from 'lucide-react'

export const metadata = { title: 'Comunicaciones · GooALS Admin' }

/** Pestaña visible pero vacía a propósito: se construye en un paso aparte, con su SQL. */
export default function AdminComunicacionesPage() {
  return (
    <div style={{ background: '#161817', border: '1px solid #2A2E2C', borderRadius: 16, padding: '40px 24px', textAlign: 'center' }}>
      <Mail aria-hidden style={{ width: 28, height: 28, color: '#7A8A85', margin: '0 auto' }} />
      <p className="fuente-titular" style={{ fontSize: 18, fontWeight: 600, marginTop: 12 }}>En construcción</p>
      <p style={{ fontSize: 13, color: '#7A8A85', marginTop: 8, lineHeight: 1.6, maxWidth: 380, marginInline: 'auto' }}>
        Aquí podrás enviar un correo a un grupo de usuarios, probarlo antes en tu cuenta y ver lo que ya se ha enviado.
      </p>
    </div>
  )
}
