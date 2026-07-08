import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { signMagicToken } from '@/lib/magic-link'

// `onboarding@resend.dev` works without domain verification but only delivers to the
// Resend account owner — override with RESEND_FROM_EMAIL once a domain is verified.
const FROM = process.env.RESEND_FROM_EMAIL || 'Inner <onboarding@resend.dev>'

function emailHtml(nombre: string | null, link: string): string {
  const saludo = nombre ? `Hola ${nombre},` : 'Hola,'
  return `
  <div style="background:#0A0A0A;padding:40px 24px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <div style="max-width:480px;margin:0 auto;">
      <div style="width:40px;height:40px;border-radius:9999px;background:#E8692A;display:flex;align-items:center;justify-content:center;">
        <span style="color:#fff;font-weight:700;font-size:14px;">In</span>
      </div>
      <h1 style="color:#F0F0F0;font-size:22px;margin:24px 0 8px;">Accede a tu cuenta</h1>
      <p style="color:#999999;font-size:14px;line-height:1.6;margin:0 0 24px;">
        ${saludo} pulsa el botón para gestionar tu suscripción. Este enlace caduca en 15 minutos y solo funciona una vez por sesión.
      </p>
      <a href="${link}" style="display:inline-block;background:#E8692A;color:#fff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:12px;font-size:15px;">
        Acceder a mi cuenta
      </a>
      <p style="color:#666666;font-size:12px;line-height:1.6;margin:28px 0 0;">
        Si no has solicitado este acceso, puedes ignorar este email.
      </p>
    </div>
  </div>`
}

// Step 1 of the magic-link flow: issue a signed token, persist it, and email it.
// Always responds { success: true } so we never reveal whether an email is registered.
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Introduce un email válido' }, { status: 400 })
    }

    const normalized = email.trim().toLowerCase()
    const service = createServiceRoleClient()
    const { data: profile } = await service
      .from('profiles')
      .select('id, nombre')
      .eq('email', normalized)
      .maybeSingle()

    // Only send if the account exists — but the response is identical either way.
    if (profile) {
      try {
        const { token, expiry } = signMagicToken(normalized)
        await service
          .from('profiles')
          .update({ magic_link_token: token, magic_link_expiry: expiry.toISOString() })
          .eq('id', profile.id)

        const link = `${process.env.NEXT_PUBLIC_APP_URL}/cuenta/acceso?token=${encodeURIComponent(token)}`
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: FROM,
          to: normalized,
          subject: 'Accede a tu cuenta Inner',
          html: emailHtml(profile.nombre, link),
        })
      } catch (err) {
        // Log but keep the response neutral so failures don't leak account existence.
        console.error('[cuenta/send-link] send failed', err)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[cuenta/send-link]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
