// Las plantillas de prompt. El prompt NO se escribe a mano para cada gooal: se
// rellena con los campos de su fila (título, categoría, ámbito, lugar) más uno
// de los tres bloques de estilo.
//
// Esa es la ventaja entera sobre Wikimedia: una foto que no gusta se retoca
// cambiando una línea de aquí y se regenera en segundos, para una o para las
// 260. Con Commons había que volver a buscar candidatas y mirarlas a ojo.
//
// ── POR QUÉ LOS PROMPTS VAN EN ESPAÑOL ────────────────────
//
// Porque quien decide si una foto vale es David, y los va a leer debajo de cada
// imagen para pedir cambios. Un prompt que no puedes leer no lo puedes retocar.
// Si se viera que el modelo obedece peor en español, se prueba en inglés y se
// mide la diferencia antes de cambiarlo.
//
// ── POR QUÉ 1024x1536 ─────────────────────────────────────
//
// Medido en el navegador, no supuesto: la tarjeta de Descubrir mide 362x579 en
// un Pixel, 402x667 en un iPhone Max y 384x650 en un Android grande. O sea una
// proporción de 0,59 a 0,625. De los tres tamaños que da la API, el vertical es
// 1024x1536 = 0,667, que es el más cercano.
//
// Y falla por el lado bueno: al ser la imagen MÁS ANCHA que la tarjeta, el
// `object-fit: cover` recorta POR LOS LADOS y no por arriba y abajo. Por eso
// todas las plantillas piden el sujeto centrado y con aire a los lados: lo que
// se pierda al recortar no puede ser el sujeto.
export const TAMANO = '1024x1536'
export const MODELO = 'gpt-image-1'
export const CALIDAD = 'medium'

// ── Lo que vale para los tres, para que la comparación sea justa ──
//
// Si una regla estuviera solo en un estilo, estaríamos comparando el estilo CON
// la regla, no los estilos entre sí.
const COMUNES = [
  'Formato vertical.',
  'NI UNA SOLA LETRA, palabra, número, logotipo, cartel, marca de agua ni firma dentro de la imagen.',
  'Ninguna cara reconocible: las personas aparecen de espaldas, en movimiento, a contraluz, muy lejos o con la cara tapada por el equipo.',
  'El sujeto va centrado y con aire a los lados, porque la imagen se recorta por los lados al mostrarse.',
  'Sin bordes, sin marco, sin collage: una sola escena que llena todo el encuadre.',
].join(' ')

// ── Los tres estilos ──────────────────────────────────────
export const ESTILOS = {
  A: {
    nombre: 'Fotográfico editorial',
    resumen: 'Como una buena foto de revista de viajes: luz natural, momento real.',
    bloque: [
      'Fotografía editorial de revista de viajes.',
      'Luz natural del momento real del día, sin flash ni iluminación de estudio.',
      'Un instante que está ocurriendo, no una pose: nadie mira a cámara, nadie sonríe al objetivo.',
      'Colores naturales y fieles, grano fino de película, profundidad de campo de objetivo rápido.',
      'Nada de aspecto de banco de imágenes: ni gente demasiado guapa, ni ropa nueva, ni escenario ordenado.',
    ].join(' '),
  },
  B: {
    nombre: 'Ilustración plana',
    resumen: 'Formas grandes, pocos colores, la paleta de la marca. Inconfundiblemente nuestra.',
    bloque: [
      'Ilustración vectorial plana, geométrica, de formas grandes y simples.',
      'Sin degradados, sin sombras suaves, sin texturas, sin contornos dibujados: solo manchas de color planas.',
      'PALETA CERRADA, exactamente estos cuatro colores y ninguno más: negro casi puro #0B0B0B, verde menta luminoso #00D1A7, blanco roto #F5F5F2 y gris verdoso apagado #7A8A85.',
      'El fondo es el negro #0B0B0B o el blanco roto #F5F5F2, y el verde menta se usa solo como acento en una parte pequeña.',
      'Las figuras son siluetas simplificadas sin rasgos faciales.',
      'Composición de cartel: mucho aire, pocos elementos, una idea sola.',
    ].join(' '),
  },
  C: {
    nombre: 'Foto estilizada',
    resumen: 'Textura de foto, tratamiento gráfico: una luz, mucho contraste, color apagado y un acento.',
    bloque: [
      'Fotografía con tratamiento gráfico, cinematográfica.',
      'Una sola fuente de luz fuerte y direccional que deja grandes zonas en sombra; contraste muy alto, negros profundos.',
      'Color desaturado, casi monocromo, salvo UN ÚNICO acento de color saturado en un elemento pequeño de la escena.',
      'La figura es pequeña dentro del encuadre y el espacio vacío manda: mucho aire alrededor.',
      'Composición gráfica y limpia, líneas claras, nada de desorden en el fondo.',
    ].join(' '),
  },
}

/**
 * El prompt de un gooal en un estilo. Se arma por partes para que se vea de
 * dónde sale cada trozo: la acción del título, el contexto, las reglas comunes
 * y el estilo.
 *
 * EL SUJETO ES LA ACCIÓN, NO EL DECORADO. Es la regla que ya está en CLAUDE.md
 * («Un gooal es una experiencia, no un sitio»): «Subir al Angliru» es una bici
 * subiendo, no la montaña. Por eso el lugar entra como CONTEXTO y se dice
 * expresamente que no sea el sujeto.
 */
export function construirPrompt(gooal, clave) {
  const estilo = ESTILOS[clave]
  if (!estilo) throw new Error('no existe el estilo ' + clave)

  const partes = []
  partes.push(`La acción de «${gooal.titulo}», ocurriendo.`)
  partes.push('EL SUJETO ES LA ACCIÓN, no el lugar ni el objeto: se tiene que ver a alguien haciéndolo.')

  if (gooal.ambito === 'lugar' && (gooal.ciudad || gooal.pais)) {
    const donde = [gooal.ciudad, gooal.pais].filter(Boolean).join(', ')
    partes.push(`Ocurre en ${donde}, y eso se nota en el entorno, pero el entorno es contexto y no el tema.`)
  }

  partes.push(CONTEXTO_CATEGORIA[gooal.categoria] ?? '')
  partes.push(COMUNES)
  partes.push(estilo.bloque)

  return partes.filter(Boolean).join(' ')
}

// Una pista corta por categoría: lo que esa categoría suele necesitar para que
// la escena no salga genérica. No describe el gooal — eso lo hace el título.
const CONTEXTO_CATEGORIA = {
  viajes: 'Escena de viaje, con el lugar reconocible por su arquitectura o su paisaje.',
  naturaleza: 'Al aire libre, con la escala del paisaje presente pero una persona dentro que da la medida.',
  eventos: 'Ambiente de acontecimiento, con gente alrededor y sensación de que pasa algo irrepetible.',
  deporte: 'Gesto deportivo en pleno movimiento, con el equipo y el esfuerzo visibles.',
  gastronomia: 'Primer plano del plato o de la comida, con las manos de quien va a comerlo y el sitio donde se come alrededor.',
  vida: 'Un momento cotidiano y personal, íntimo, de alguien consiguiendo algo suyo.',
}
