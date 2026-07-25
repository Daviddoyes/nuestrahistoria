import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { isAdminRequest } from '@/lib/admin-auth'

const SCHEMA = {
  type: 'object',
  properties: { descripcion: { type: 'string' } },
  required: ['descripcion'],
  additionalProperties: false,
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'IA no configurada' }, { status: 503 })
  }

  const { gooalId } = await request.json()
  if (!gooalId) return NextResponse.json({ error: 'Falta gooalId' }, { status: 400 })

  const service = createServiceRoleClient()
  const { data: gooal } = await service
    .from('gooals')
    .select('titulo')
    .eq('id', gooalId)
    .single()

  if (!gooal) return NextResponse.json({ error: 'Gooal no encontrado' }, { status: 404 })

  const titulo = (gooal as { titulo: string }).titulo

  const prompt = `Genera una descripción aspiracional de 2-3 frases para la experiencia "${titulo}".
IMPORTANTE: NO menciones nombres de empresas, locales, marcas ni lugares específicos.
Habla solo de la experiencia: sensaciones, emociones, lo que se vive. Tono inspirador y cercano.`

  try {
    const anthropic = new Anthropic()
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 512,
      thinking: { type: 'disabled' },
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: prompt }],
    })

    if (message.stop_reason === 'refusal') {
      return NextResponse.json({ error: 'La IA rechazó la petición' }, { status: 502 })
    }
    const texto = message.content.find(b => b.type === 'text')?.text
    if (!texto) return NextResponse.json({ error: 'Sin respuesta' }, { status: 502 })

    const { descripcion } = JSON.parse(texto) as { descripcion: string }

    const { error } = await service.from('gooals').update({ descripcion }).eq('id', gooalId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ descripcion })
  } catch (err) {
    console.error('[regenerar-descripcion]', err)
    return NextResponse.json({ error: 'Error al regenerar' }, { status: 500 })
  }
}
