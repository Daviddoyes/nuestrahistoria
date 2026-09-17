import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Pide el correo de "he olvidado la contraseña".
 *
 * Se pide DESDE EL SERVIDOR y con flowType 'implicit' a propósito. Con el modo
 * PKCE del navegador, Supabase manda un enlace que solo sirve en el mismo
 * navegador donde se pidió: quien pedía el correo en el ordenador y abría el
 * enlace en el móvil acababa en la pantalla de entrar, sin poder cambiar nada.
 * Sin PKCE, el enlace lo verifica nuestro servidor en /auth/confirm y funciona
 * en cualquier dispositivo.
 */
export async function POST(request: Request) {
  const { email } = await request.json().catch(() => ({ email: '' }))
  const destino = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!EMAIL_RE.test(destino)) {
    return NextResponse.json({ error: 'Escribe un email válido.' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false } },
  )

  const { error } = await supabase.auth.resetPasswordForEmail(destino)
  // Se responde lo mismo exista la cuenta o no: si no, esta ruta serviría para
  // averiguar quién está registrado. Los fallos de verdad quedan en el registro.
  if (error) console.error('[recuperar]', destino.replace(/(.).*(@.*)/, '$1***$2'), error.message)

  return NextResponse.json({ ok: true })
}
