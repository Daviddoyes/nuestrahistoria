import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceRoleClient } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Given an email, create a Stripe Billing Portal session and return its URL.
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Introduce un email válido' }, { status: 400 })
    }

    const service = createServiceRoleClient()
    const { data: profile } = await service
      .from('profiles')
      .select('stripe_customer_id')
      .eq('email', email.trim().toLowerCase())
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
