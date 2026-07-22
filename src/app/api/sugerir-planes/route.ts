import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient as createServerClient } from '@/lib/supabase/server'

const CATEGORIAS = ['viajes', 'deporte', 'gastronomia', 'cultura', 'aventura'] as const

// Structured outputs: la respuesta viene validada contra este esquema, así que
// el JSON.parse de abajo no puede fallar por texto suelto ni por ```json.
const SCHEMA = {
  type: 'object',
  properties: {
    planes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titulo: { type: 'string' },
          categoria: { type: 'string', enum: CATEGORIAS },
          emoji: { type: 'string' },
        },
        required: ['titulo', 'categoria', 'emoji'],
        additionalProperties: false,
      },
    },
  },
  required: ['planes'],
  additionalProperties: false,
}

export async function POST(request: Request) {
  // Sin esto cualquiera puede llamar al endpoint y gastar la cuota de la API.
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[sugerir-planes] falta ANTHROPIC_API_KEY')
    return NextResponse.json({ error: 'Sugerencias no configuradas' }, { status: 503 })
  }

  const { nombre, intereses, conQuien, planesActuales, historiasCompletadas } = await request.json()

  const prompt = `Eres un asistente que sugiere planes y experiencias para vivir.

El usuario se llama ${nombre || 'alguien'}.
Sus intereses son: ${intereses?.join(', ') || 'variados'}.
Suele hacer planes: ${conQuien?.join(', ') || 'con amigos'}.
Ya tiene estos planes pendientes: ${planesActuales?.slice(0, 5).join(', ') || 'ninguno'}.
Ha completado estos planes: ${historiasCompletadas?.slice(0, 5).join(', ') || 'ninguno'}.

Sugiere exactamente 8 planes específicos, realizables y emocionantes
que este usuario querría añadir a su bucket list.
Los planes deben ser variados, concretos y aspiracionales.
NO repitas planes que ya tiene.
Escribe los títulos en español, en infinitivo y de menos de 60 caracteres.
Cada plan lleva un único emoji representativo.`

  try {
    const anthropic = new Anthropic()

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 2000,
      thinking: { type: 'disabled' },
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: SCHEMA },
      },
      messages: [{ role: 'user', content: prompt }],
    })

    if (message.stop_reason === 'refusal') {
      console.error('[sugerir-planes] refusal:', message.stop_details)
      return NextResponse.json({ planes: [] }, { status: 502 })
    }

    const texto = message.content.find(b => b.type === 'text')?.text
    if (!texto) {
      console.error('[sugerir-planes] respuesta sin texto, stop_reason:', message.stop_reason)
      return NextResponse.json({ planes: [] }, { status: 502 })
    }

    const { planes } = JSON.parse(texto) as {
      planes: { titulo: string; categoria: string; emoji: string }[]
    }

    return NextResponse.json({ planes })
  } catch (err) {
    console.error('[sugerir-planes]', err)
    return NextResponse.json({ error: 'No se pudieron generar sugerencias' }, { status: 500 })
  }
}
