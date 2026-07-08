import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { resolveMagicToken } from '@/lib/subscription'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Cancel the subscription at period end. Requires a valid magic-link token — the
// email is derived from the token, never trusted from the request body. The user
// keeps access until their renewal date; the webhook flips the plan to 'free' when
// Stripe finally deletes the subscription.
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
      .select('stripe_subscription_id')
      .eq('email', email)
      .maybeSingle()

    if (!profile?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No encontramos ninguna suscripción con ese email' },
        { status: 404 }
      )
    }

    const subscription = await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    const item = subscription.items.data[0]
    const periodEnd =
      item?.current_period_end ??
      (subscription as unknown as { current_period_end?: number }).current_period_end ??
      null

    return NextResponse.json({ canceled: true, currentPeriodEnd: periodEnd })
  } catch (err) {
    console.error('[subscription/cancel]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
