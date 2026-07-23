import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { isAdminRequest } from '@/lib/admin-auth'

const CATEGORIAS = ['viajes', 'deporte', 'gastronomia', 'cultura', 'aventura', 'musica'] as const
const DIFICULTADES = ['facil', 'medio', 'dificil'] as const
const CANTIDADES = [5, 10, 20, 50]

// Structured outputs: la respuesta viene validada contra este esquema, así que
// no hace falta limpiar ```json ni arriesgarse con un JSON.parse a ciegas.
const SCHEMA = {
  type: 'object',
  properties: {
    experiencias: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titulo: { type: 'string' },
          descripcion: { type: 'string' },
          categoria: { type: 'string', enum: CATEGORIAS },
          subcategoria: { type: 'string' },
          ciudad: { type: 'string' },
          pais: { type: 'string' },
          lugar_nombre: { type: 'string' },
          lugar_direccion: { type: 'string' },
          dificultad: { type: 'string', enum: DIFICULTADES },
          duracion: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: [
          'titulo', 'descripcion', 'categoria', 'subcategoria',
          'ciudad', 'pais', 'lugar_nombre', 'lugar_direccion',
          'dificultad', 'duracion', 'tags',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['experiencias'],
  additionalProperties: false,
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[generar-experiencias] falta ANTHROPIC_API_KEY')
    return NextResponse.json({ error: 'Generación no configurada' }, { status: 503 })
  }

  const body = await request.json()
  const categoria = String(body.categoria ?? '').toLowerCase()
  const tipo = String(body.tipo ?? '').trim()
  const zona = String(body.zona ?? '').trim()
  const cantidad = CANTIDADES.includes(Number(body.cantidad)) ? Number(body.cantidad) : 10

  if (!CATEGORIAS.includes(categoria as never)) {
    return NextResponse.json({ error: 'Categoría no válida' }, { status: 400 })
  }
  if (!tipo || !zona) {
    return NextResponse.json({ error: 'Faltan tipo o zona' }, { status: 400 })
  }

  const prompt = `Genera ${cantidad} experiencias/planes específicos y reales del tipo "${tipo}" en "${zona}" para la categoría "${categoria}".

Cada experiencia debe ser:
- Específica y real (con nombre de lugar real si aplica)
- Localizada en una ciudad concreta
- Aspiracional pero realizable

Reglas de los campos:
- titulo: en español, en infinitivo o como nombre del plan, menos de 70 caracteres.
- descripcion: una o dos frases evocadoras en español.
- categoria: exactamente "${categoria}".
- subcategoria: "${tipo}".
- dificultad: "facil", "medio" o "dificil".
- pais: el país real de la ciudad.
- tags: 2 o 4 etiquetas en minúsculas.
No repitas experiencias.`

  try {
    const anthropic = new Anthropic()

    const message = await anthropic.messages.create({
      // Sonnet 5: mismo tier que pediste (era 4-6, la generación anterior).
      model: 'claude-sonnet-5',
      max_tokens: 16000,
      thinking: { type: 'disabled' },
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: SCHEMA },
      },
      messages: [{ role: 'user', content: prompt }],
    })

    if (message.stop_reason === 'refusal') {
      console.error('[generar-experiencias] refusal:', message.stop_details)
      return NextResponse.json({ experiencias: [] }, { status: 502 })
    }

    const texto = message.content.find(b => b.type === 'text')?.text
    if (!texto) {
      console.error('[generar-experiencias] sin texto, stop_reason:', message.stop_reason)
      return NextResponse.json({ experiencias: [] }, { status: 502 })
    }

    const { experiencias } = JSON.parse(texto)
    return NextResponse.json({ experiencias })
  } catch (err) {
    console.error('[generar-experiencias]', err)
    return NextResponse.json({ experiencias: [], error: 'Error al generar' }, { status: 500 })
  }
}
