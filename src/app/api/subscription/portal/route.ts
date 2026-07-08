import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { resolveMagicToken } from '@/lib/subscription'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Create a Stripe Billing Portal session. Requires a valid magic-link token —
// the email is derived from the token, never trusted from the request body.
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    const email = await resolveMagicToken(token)
    if (!email) {
      return NextResponse.json({ error: 'Enlace no válido o caducado' }, { status: 401 })
    }

    const service = createServiceRoleClient()
    const { data: profile } = await service
      .from('profiles')
      .select('stripe_customer_id')
      .eq('email', email)
      .maybeSingle()

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No encontramos ninguna suscripción con ese email' },
        { status: 404 }
      )
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/cuenta`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[subscription/portal]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
