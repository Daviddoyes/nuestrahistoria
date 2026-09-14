import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { esAdmin } from '@/lib/admin-auth'
import {
  CAMPANA_RELANZAMIENTO, ASUNTO_RELANZAMIENTO, htmlRelanzamiento,
} from '@/lib/email-relanzamiento'

const FROM = 'David de GooALS <hola@gooals.app>'

type Destinatario = { id: string; nombre: string | null; email: string }

/** Usuarios con email, que no se han dado de baja y a los que no se ha escrito. */
async function pendientes(
  service: ReturnType<typeof createServiceRoleClient>,
): Promise<Destinatario[]> {
  const { data: perfiles } = await service
    .from('profiles')
    .select('id, nombre')
    .eq('acepta_emails', true)

  const { data: yaEnviados } = await service
    .from('emails_enviados')
    .select('user_id')
    .eq('campana', CAMPANA_RELANZAMIENTO)

  const escritos = new Set(
    ((yaEnviados ?? []) as { user_id: string }[]).map(e => e.user_id),
  )

  // El email vive en auth.users, no en profiles.
  const { data: cuentas } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const emailPorId = new Map<string, string>(
    ((cuentas?.users ?? []) as { id: string; email?: string }[])
      .map(u => [u.id, u.email ?? '']),
  )

  return ((perfiles ?? []) as { id: string; nombre: string | null }[])
    .map(p => ({ id: p.id, nombre: p.nombre, email: emailPorId.get(p.id) ?? '' }))
    .filter(d => d.email && !escritos.has(d.id))
}

// ── Cuánta gente hay pendiente ──────────────────────────────────
export async function GET() {
  if (!await esAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceRoleClient()
  const lista = await pendientes(service)

  const { data: enviados } = await service
    .from('emails_enviados')
    .select('estado')
    .eq('campana', CAMPANA_RELANZAMIENTO)

  const porEstado: Record<string, number> = {}
  for (const e of (enviados ?? []) as { estado: string }[]) {
    porEstado[e.estado] = (porEstado[e.estado] ?? 0) + 1
  }

  return NextResponse.json({
    pendientes: lista.length,
    porEstado,
    configurado: Boolean(process.env.RESEND_API_KEY),
    muestra: lista.slice(0, 5).map(d => d.email),
  })
}

// ── Enviar ──────────────────────────────────────────────────────
export async function POST(request: Request) {
  if (!await esAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'Falta RESEND_API_KEY. Añádela en .env.local y en Vercel.' },
      { status: 503 },
    )
  }

  const body = await request.json()
  const fechaBorrado = String(body.fechaBorrado ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaBorrado)) {
    return NextResponse.json({ error: 'Falta la fecha de borrado' }, { status: 400 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const service = createServiceRoleClient()

  // ── Prueba: solo a quien pulsa el botón, y sin registrar nada ──
  if (body.modo === 'prueba') {
    const supa = await createServerClient()
    const { data: { user } } = await supa.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ error: 'Tu cuenta no tiene email' }, { status: 400 })
    }

    const { data: perfil } = await service
      .from('profiles').select('nombre').eq('id', user.id).single()

    const { error } = await resend.emails.send({
      from: FROM,
      to: user.email,
      subject: `[PRUEBA] ${ASUNTO_RELANZAMIENTO}`,
      html: htmlRelanzamiento(
        (perfil as { nombre: string | null } | null)?.nombre ?? null,
        user.email, user.id, fechaBorrado,
      ),
    })
    if (error) {
      console.error('[relanzamiento:prueba]', error)
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    return NextResponse.json({ success: true, enviados: 1, a: user.email })
  }

  // ── Envío real ───────────────────────────────────────────────
  const lista = await pendientes(service)
  if (lista.length === 0) {
    return NextResponse.json({ success: true, enviados: 0, nota: 'No queda nadie pendiente' })
  }

  // Se reservan ANTES de enviar. El índice único (user_id, campana) es lo que
  // hace que pulsar el botón dos veces no mande dos correos: el segundo choca
  // aquí, `.select()` no lo devuelve, y no llega a Resend.
  const { data: reservados, error: errorReserva } = await service
    .from('emails_enviados')
    .upsert(
      lista.map(d => ({
        user_id: d.id, email: d.email,
        campana: CAMPANA_RELANZAMIENTO, estado: 'enviando',
      })),
      { onConflict: 'user_id,campana', ignoreDuplicates: true },
    )
    .select('user_id, email')

  if (errorReserva) {
    console.error('[relanzamiento] reserva', errorReserva)
    return NextResponse.json({ error: errorReserva.message }, { status: 500 })
  }

  const mios = (reservados ?? []) as { user_id: string; email: string }[]
  if (mios.length === 0) {
    return NextResponse.json({ success: true, enviados: 0, nota: 'Ya estaban todos reservados' })
  }

  const porId = new Map(lista.map(d => [d.id, d]))
  const ids = mios.map(m => m.user_id)

  try {
    // El endpoint de lote de Resend admite hasta 100 por llamada; con 52 basta
    // una, y así no hay que pelearse con el límite de peticiones por segundo.
    const { error } = await resend.batch.send(
      mios.map(m => {
        const d = porId.get(m.user_id)!
        return {
          from: FROM,
          to: m.email,
          subject: ASUNTO_RELANZAMIENTO,
          html: htmlRelanzamiento(d.nombre, d.email, d.id, fechaBorrado),
        }
      }),
    )

    if (error) throw new Error(error.message)

    await service
      .from('emails_enviados')
      .update({ estado: 'enviado' })
      .in('user_id', ids)
      .eq('campana', CAMPANA_RELANZAMIENTO)

    return NextResponse.json({ success: true, enviados: mios.length })
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'Error al enviar'
    console.error('[relanzamiento] envío', err)

    // Se borran las reservas para que se pueda reintentar. Si se dejaran, esos
    // usuarios contarían como escritos sin haber recibido nada.
    await service
      .from('emails_enviados')
      .delete()
      .in('user_id', ids)
      .eq('campana', CAMPANA_RELANZAMIENTO)

    return NextResponse.json({ error: mensaje }, { status: 502 })
  }
}
