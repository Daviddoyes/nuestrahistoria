import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { destinoSeguro } from '@/lib/redireccion'
import { COOKIE_RECUPERACION, opcionesCookieRecuperacion, valeParaRecuperar } from '@/lib/recuperacion'

/**
 * La puerta de entrada de los enlaces del correo.
 *
 * El enlace trae un token que se verifica AQUÍ, en el servidor, contra Supabase.
 * Por eso funciona aunque el correo se abra en otro dispositivo distinto de
 * aquel donde se pidió, que es lo que hace todo el mundo.
 *
 * Si sale bien, deja la sesión en una cookie y, además, el permiso para abrir
 * /reset-password. Si el enlace está caducado o ya se usó, se va a una pantalla
 * que lo explica y deja pedir otro, no a la de entrar.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash') ?? ''
  const tipo = searchParams.get('type') ?? ''
  // Solo se acepta lo que de verdad mandamos por correo.
  if (!tokenHash || tipo !== 'recovery') {
    return NextResponse.redirect(`${origin}/enlace-caducado`)
  }

  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash })

  if (error || !data.user) {
    console.error('[auth/confirm]', error?.message ?? 'sin usuario')
    return NextResponse.redirect(`${origin}/enlace-caducado`)
  }

  // destinoSeguro evita que un enlace manipulado ("next=https://otra-web") se
  // lleve a la persona fuera de GooALS con la sesión recién abierta.
  const destino = destinoSeguro(searchParams.get('next')) ?? '/reset-password'
  const respuesta = NextResponse.redirect(`${origin}${destino}`)
  respuesta.cookies.set(COOKIE_RECUPERACION, valeParaRecuperar(data.user.id), opcionesCookieRecuperacion)
  return respuesta
}
