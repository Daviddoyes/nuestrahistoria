import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log('[upload] supabaseUrl:', supabaseUrl)
    console.log('[upload] file name:', file.name, 'size:', file.size)

    if (!supabaseUrl || !supabaseKey) {
      console.error('[upload] missing env vars')
      return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const fileName = `foto-${Date.now()}.jpg`

    console.log('[upload] fileName:', fileName)
    console.log('[upload] bucket:', 'fotos')

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('fotos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      })

    console.log('[upload] error:', JSON.stringify(uploadError))

    if (uploadError) {
      console.error('[upload] uploadError:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('fotos')
      .getPublicUrl(fileName)

    console.log('[upload] publicUrl:', publicUrl)
    return NextResponse.json({ publicUrl })
  } catch (err) {
    console.error('[upload] unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
