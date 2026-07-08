import { NextRequest, NextResponse } from 'next/server'
import { resolveMagicToken, getSubscriptionForEmail } from '@/lib/subscription'

// Step 2: validate a magic-link token and, only if valid, return the subscription data.
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    const email = await resolveMagicToken(token)
    if (!email) {
      return NextResponse.json({ valid: false })
    }

    const subscription = await getSubscriptionForEmail(email)
    return NextResponse.json({ valid: true, email, subscription })
  } catch (err) {
    console.error('[cuenta/verify-token]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
