import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const received = body?.password ?? ''
  const envPassword = process.env.APP_PASSWORD ?? ''

  console.log('[auth] body:', JSON.stringify(body))
  console.log('[auth] received:', JSON.stringify(received))
  console.log('[auth] env APP_PASSWORD set:', envPassword.length > 0)
  console.log('[auth] env length:', envPassword.length, '| received length:', received.length)

  const success = received.trim() === envPassword.trim()
  console.log('[auth] success:', success)

  return NextResponse.json({ success })
}
