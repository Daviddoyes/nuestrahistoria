import Link from 'next/link'

export const metadata = {
  title: 'Baja de correos · GooALS',
  robots: { index: false, follow: false },
}

export default async function BajaPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  const { estado } = await searchParams
  const ok = estado === 'ok'

  return (
    <div style={{
      minHeight: '100dvh', background: '#0B0B0B', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '0 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.25em',
          color: '#00D1A7', textTransform: 'uppercase', marginBottom: 8,
        }}>
          GooALS
        </p>
        <div style={{ width: 40, height: 1, background: '#00D1A7', margin: '0 auto 28px' }} />

        {ok ? (
          <>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#FFFFFF', marginBottom: 12 }}>
              Hecho, no te escribimos más.
            </p>
            <p style={{ fontSize: 15, color: '#A3B1AC', lineHeight: 1.6 }}>
              Tu cuenta sigue como estaba: puedes entrar cuando quieras. Esto solo
              afecta a los correos.
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#FFFFFF', marginBottom: 12 }}>
              Este enlace no vale.
            </p>
            <p style={{ fontSize: 15, color: '#A3B1AC', lineHeight: 1.6 }}>
              Puede que esté incompleto por cómo lo cortó tu programa de correo.
              Responde al email y te damos de baja a mano.
            </p>
          </>
        )}

        <Link
          href="/"
          style={{
            display: 'inline-block', marginTop: 28, padding: '12px 22px',
            borderRadius: 12, background: '#00D1A7', color: '#0B0B0B',
            fontWeight: 600, fontSize: 15, textDecoration: 'none',
          }}
        >
          Ir a GooALS
        </Link>
      </div>
    </div>
  )
}
