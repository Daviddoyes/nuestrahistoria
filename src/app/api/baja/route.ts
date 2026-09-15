import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { firmaBajaValida } from '@/lib/email-baja'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gooals.app'

/**
 * Baja de correos desde el enlace del pie de un email.
 *
 * Es un GET a propósito: es lo que abre un enlace al pulsarlo, y darse de baja
 * tiene que funcionar sin cuenta iniciada y sin más pasos. El enlace va firmado
 * para que nadie pueda dar de baja a otra persona cambiando el id de la URL.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const userId = url.searchParams.get('u') ?? ''
  const firma = url.searchParams.get('t') ?? ''

  const destino = new URL('/baja', APP_URL)

  if (!userId || !firma || !firmaBajaValida(userId, firma)) {
    destino.searchParams.set('estado', 'error')
    return NextResponse.redirect(destino)
  }

  const service = createServiceRoleClient()
  const { error } = await service
    .from('profiles')
    .update({ acepta_emails: false })
    .eq('id', userId)

  destino.searchParams.set('estado', error ? 'error' : 'ok')
  if (error) console.error('[baja]', error)
  return NextResponse.redirect(destino)
}
