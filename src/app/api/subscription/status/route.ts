import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceRoleClient } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Public lookup: given an email, return the state of that user's subscription.
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Introduce un email válido' }, { status: 400 })
    }

    const service = createServiceRoleClient()
    const { data: profile } = await service
      .from('profiles')
      .select('nombre, stripe_customer_id, stripe_subscription_id, plan')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    // No account, or no subscription ever created → treat as "sin suscripción".
    if (!profile || !profile.stripe_subscription_id) {
      return NextResponse.json({ active: false })
    }

    let subscription: Stripe.Subscription
    try {
      subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
    } catch {
      return NextResponse.json({ active: false })
    }

    const isActive = subscription.status === 'active' || subscription.status === 'trialing'
    if (!isActive) {
      return NextResponse.json({ active: false })
    }

    const item = subscription.items.data[0]
    const interval = item?.price?.recurring?.interval
    const priceId = item?.price?.id

    // Prefer matching the configured price IDs, fall back to the interval.
    let plan: 'monthly' | 'yearly'
    if (priceId === process.env.STRIPE_PRICE_YEARLY || interval === 'year') {
      plan = 'yearly'
    } else {
      plan = 'monthly'
    }

    // In recent Stripe API versions current_period_end lives on the item.
    const periodEnd =
      item?.current_period_end ??
      (subscription as unknown as { current_period_end?: number }).current_period_end ??
      null

    return NextResponse.json({
      active: true,
      nombre: profile.nombre ?? null,
      plan,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    })
  } catch (err) {
    console.error('[subscription/status]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
