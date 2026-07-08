import Stripe from 'stripe'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { verifyMagicToken } from '@/lib/magic-link'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export type SubscriptionInfo =
  | {
      active: true
      nombre: string | null
      plan: 'monthly' | 'yearly'
      currentPeriodEnd: number | null
      cancelAtPeriodEnd: boolean
    }
  | { active: false }

// Reads the live subscription state for an email from Stripe. Server-only.
export async function getSubscriptionForEmail(email: string): Promise<SubscriptionInfo> {
  const service = createServiceRoleClient()
  const { data: profile } = await service
    .from('profiles')
    .select('nombre, stripe_subscription_id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()

  if (!profile?.stripe_subscription_id) return { active: false }

  let subscription: Stripe.Subscription
  try {
    subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
  } catch {
    return { active: false }
  }

  const isActive = subscription.status === 'active' || subscription.status === 'trialing'
  if (!isActive) return { active: false }

  const item = subscription.items.data[0]
  const interval = item?.price?.recurring?.interval
  const priceId = item?.price?.id
  const plan: 'monthly' | 'yearly' =
    priceId === process.env.STRIPE_PRICE_YEARLY || interval === 'year' ? 'yearly' : 'monthly'

  const periodEnd =
    item?.current_period_end ??
    (subscription as unknown as { current_period_end?: number }).current_period_end ??
    null

  return {
    active: true,
    nombre: profile.nombre ?? null,
    plan,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  }
}

// Full validation for a magic-link token: signature + expiry + it still matches the
// token currently stored for that profile (so a re-issued link revokes the old one).
// Returns the verified email, or null if the token is invalid/expired/superseded.
export async function resolveMagicToken(token: unknown): Promise<string | null> {
  const verified = verifyMagicToken(token)
  if (!verified) return null

  const service = createServiceRoleClient()
  const { data: profile } = await service
    .from('profiles')
    .select('magic_link_token, magic_link_expiry')
    .eq('email', verified.email)
    .maybeSingle()

  if (!profile || profile.magic_link_token !== token) return null
  if (
    !profile.magic_link_expiry ||
    new Date(profile.magic_link_expiry).getTime() < Date.now()
  ) {
    return null
  }

  return verified.email
}
