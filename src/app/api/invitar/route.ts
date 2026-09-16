import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { REMITENTE_INVITACIONES } from '@/lib/email-remitente'
import { htmlBase, textoBase } from '@/lib/email-plantilla'
import { partesInvitacion } from '@/lib/email-invitacion'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  // El invitador sale de la sesión, no del body: si no, cualquiera podría
  // mandar emails en nombre de otro usuario desde este endpoint.
  const serverSupa = await createServerClient()
  const { data: { user } } = await serverSupa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  if (!process.env.RESEND_API_KEY) {
    console.error('[invitar] falta RESEND_API_KEY')
    return NextResponse.json({ error: 'Invitaciones no configuradas' }, { status: 503 })
  }

  const { email } = await request.json()
  const destino = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!EMAIL_RE.test(destino)) {
    return NextResponse.json({ error: 'Email no válido' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('nombre')
    .eq('id', user.id)
    .single()

  const nombreInvitador =
    (profile as { nombre: string | null } | null)?.nombre || user.email || 'Alguien'

  // Crear invitación (el token lo genera el default de la columna)
  const { data: inv, error } = await supabase
    .from('invitaciones_email')
    .insert({
      email_destino: destino,
      invitado_por: user.id,
      nombre_invitador: nombreInvitador,
    })
    .select('token')
    .single()

  if (error || !inv) {
    console.error('[invitar] insert failed:', error)
    return NextResponse.json({ error: error?.message ?? 'No se pudo crear la invitación' }, { status: 500 })
  }

  const { token } = inv as { token: string }

  const partes = partesInvitacion(nombreInvitador, token)

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error: sendError } = await resend.emails.send({
      from: REMITENTE_INVITACIONES,
      to: destino,
      subject: partes.asunto,
      html: htmlBase(partes),
      // En texto plano además del HTML: sin ella, más correos acaban en spam.
      text: textoBase(partes),
    })

    // Resend devuelve el fallo en el body, no lanzando: sin esto la UI diría
    // "invitación enviada" con el email muerto en el camino.
    if (sendError) {
      console.error('[invitar] resend error:', sendError)
      return NextResponse.json({ error: 'No se pudo enviar el email' }, { status: 502 })
    }
  } catch (err) {
    console.error('[invitar] resend threw:', err)
    return NextResponse.json({ error: 'No se pudo enviar el email' }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
