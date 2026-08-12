import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

const FROM = 'GooALS <hola@gooals.app>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gooals.app'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function inviteHtml(nombreInvitador: string, token: string) {
  return `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 480px; margin: 0 auto; background: #0A0A0A; color: #F0F0F0; padding: 48px 32px;">
        <p style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #1DE9B6; margin: 0 0 32px 0;">GooALS</p>
        <h1 style="font-size: 28px; font-weight: 700; margin: 0 0 16px 0; color: #F0F0F0;">${nombreInvitador} quiere que vivas más.</h1>
        <p style="font-size: 15px; line-height: 1.7; color: #999; margin: 0 0 32px 0;">
          Te ha invitado a unirte a GooALS — la app para convertir tus intenciones en recuerdos.
          Crea tu bucket list, vívela y compártela.
        </p>
        <a href="${APP_URL}/invite/${token}"
           style="display: inline-block; background: #1DE9B6; color: #0A0A0A; text-decoration: none; padding: 14px 32px; font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; border-radius: 8px;">
          Unirme a GooALS
        </a>
        <p style="font-size: 12px; color: #444; margin: 40px 0 0 0; line-height: 1.6;">
          Si no conoces a ${nombreInvitador} ignora este mensaje.
        </p>
      </div>
    `
}

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

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error: sendError } = await resend.emails.send({
      from: FROM,
      to: destino,
      subject: `${nombreInvitador} te invita a unirse a GooALS`,
      html: inviteHtml(nombreInvitador, token),
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
