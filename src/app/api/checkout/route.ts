import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { createServiceRoleClient } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { billing } = await request.json()

    const priceId =
      billing === 'monthly'
        ? process.env.STRIPE_PRICE_MONTHLY
        : process.env.STRIPE_PRICE_YEARLY

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID no configurado' }, { status: 500 })
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {},
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const service = createServiceRoleClient()
    const { data: profile } = await service
      .from('profiles')
      .select('stripe_customer_id, email, nombre')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.nombre || undefined,
        metadata: { userId: user.id },
      })
      customerId = customer.id
      await service
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/planes?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[checkout]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
