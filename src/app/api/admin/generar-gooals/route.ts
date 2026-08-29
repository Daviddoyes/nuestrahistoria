import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { isAdminRequest } from '@/lib/admin-auth'
import { CATEGORIAS, DIFICULTADES, esCategoria, puntosPorDificultad } from '@/lib/gooals'

const CANTIDAD = 20

// Structured outputs: la respuesta viene validada contra este esquema, así que
// no hace falta limpiar ```json ni arriesgarse con un JSON.parse a ciegas.
const SCHEMA = {
  type: 'object',
  properties: {
    gooals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titulo: { type: 'string' },
          descripcion: { type: 'string' },
          categoria: { type: 'string', enum: CATEGORIAS },
          dificultad: { type: 'string', enum: DIFICULTADES },
          ciudad: { type: 'string' },
          pais: { type: 'string' },
        },
        required: ['titulo', 'descripcion', 'categoria', 'dificultad', 'ciudad', 'pais'],
        additionalProperties: false,
      },
    },
  },
  required: ['gooals'],
  additionalProperties: false,
}

type GooalGenerado = {
  titulo: string
  descripcion: string
  categoria: string
  dificultad: string
  ciudad: string
  pais: string
  puntos: number
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[generar-gooals] falta ANTHROPIC_API_KEY')
    return NextResponse.json({ error: 'Generación no configurada' }, { status: 503 })
  }

  const body = await request.json()
  const categoria = String(body.categoria ?? '').toLowerCase()
  const zona = String(body.zona ?? 'España').trim() || 'España'

  if (!esCategoria(categoria)) {
    return NextResponse.json({ error: 'Categoría no válida' }, { status: 400 })
  }

  const prompt = `Genera ${CANTIDAD} "gooals" (retos vitales que apetece conseguir) de la categoría "${categoria}", pensados para gente de ${zona}.

Un gooal es algo concreto que una persona puede lograr y demostrar con una foto.

Reglas de los campos:
- titulo: en español, en infinitivo, menos de 70 caracteres. Concreto y demostrable con una foto ("Nadar en una cala secreta", no "Disfrutar del mar").
- descripcion: 2 frases aspiracionales en español. NO menciones marcas, empresas ni locales concretos. Habla de la experiencia: qué se siente, qué se vive.
- categoria: exactamente "${categoria}".
- dificultad: "facil" (algo de un rato, sin preparación), "dificil" (requiere planificación, dinero o entrenamiento) o "epico" (un hito de los que se cuentan toda la vida).
- ciudad y pais: si el gooal es de un sitio concreto, indícalos; si vale en cualquier parte, pon cadena vacía en ambos.

Reparte las dificultades: aproximadamente la mitad fáciles, un tercio difíciles y el resto épicos.
No repitas gooals ni escribas variaciones del mismo.`

  try {
    const anthropic = new Anthropic()

    const message = await anthropic.messages.create({
      model: 'claude-opus-5',
      max_tokens: 16000,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: SCHEMA },
      },
      messages: [{ role: 'user', content: prompt }],
    })

    if (message.stop_reason === 'refusal') {
      console.error('[generar-gooals] refusal:', message.stop_details)
      return NextResponse.json({ gooals: [], error: 'La generación fue rechazada' }, { status: 502 })
    }

    const texto = message.content.find(b => b.type === 'text')?.text
    if (!texto) {
      console.error('[generar-gooals] sin texto, stop_reason:', message.stop_reason)
      return NextResponse.json({ gooals: [], error: 'Respuesta vacía' }, { status: 502 })
    }

    const { gooals } = JSON.parse(texto) as { gooals: Omit<GooalGenerado, 'puntos'>[] }

    // Los puntos los pone el servidor desde el baremo, no el modelo: así el
    // catálogo no se desequilibra si la IA se inventa una puntuación.
    const conPuntos: GooalGenerado[] = gooals.map(g => ({
      ...g,
      puntos: puntosPorDificultad(g.dificultad),
    }))

    return NextResponse.json({ gooals: conPuntos })
  } catch (err) {
    console.error('[generar-gooals]', err)
    return NextResponse.json({ gooals: [], error: 'Error al generar' }, { status: 500 })
  }
}
