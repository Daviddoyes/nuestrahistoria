import crypto from 'crypto'

// Self-contained, HMAC-signed magic-link tokens.
// Format: `<base64url(payload)>.<base64url(hmac)>` where payload is { email, exp }.
// The signature proves we issued it; `exp` bounds its lifetime. We also persist the
// token in the DB (profiles.magic_link_token) so a newly issued link invalidates the
// previous one — see `resolveMagicToken` in lib/subscription.

const TTL_MS = 15 * 60 * 1000 // 15 minutes

function secret(): string {
  const s = process.env.EMAIL_VERIFICATION_SECRET
  if (!s) throw new Error('EMAIL_VERIFICATION_SECRET no configurado')
  return s
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function signMagicToken(email: string): { token: string; expiry: Date } {
  const exp = Date.now() + TTL_MS
  const payload = Buffer.from(
    JSON.stringify({ email: email.trim().toLowerCase(), exp })
  ).toString('base64url')
  return { token: `${payload}.${sign(payload)}`, expiry: new Date(exp) }
}

// Verifies signature + expiry only (no DB check). Returns the email or null.
export function verifyMagicToken(token: unknown): { email: string } | null {
  if (typeof token !== 'string' || !token.includes('.')) return null

  const [payload, providedSig] = token.split('.')
  if (!payload || !providedSig) return null

  let expectedSig: string
  try {
    expectedSig = sign(payload)
  } catch {
    return null
  }

  const a = Buffer.from(providedSig)
  const b = Buffer.from(expectedSig)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  try {
    const { email, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      email?: string
      exp?: number
    }
    if (!email || typeof exp !== 'number' || Date.now() > exp) return null
    return { email }
  } catch {
    return null
  }
}
