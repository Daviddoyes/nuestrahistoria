import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceRoleClient } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Given an email, cancel the user's subscription at the end of the current period.
// The user keeps access until their renewal date; the webhook flips the plan to
// 'free' when Stripe finally deletes the subscription.
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Introduce un email válido' }, { status: 400 })
    }

    const service = createServiceRoleClient()
    const { data: profile } = await service
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('email', email.trim().toLowerCase())
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
