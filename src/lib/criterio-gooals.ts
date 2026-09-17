// EL criterio editorial del catálogo: qué es un buen gooal y qué no.
//
// Vive aquí, en un solo sitio, porque lo usan tres cosas que tienen que decir
// exactamente lo mismo: el prompt de "Generar con IA", el recordatorio del panel
// al crear o corregir a mano, y CLAUDE.md, que lo explica para quien trabaje en
// el repo. Si cambia el criterio, cambia aquí.
//
// Lo definió David corrigiendo títulos malos, y los ejemplos son esos mismos
// casos: sin ejemplos, una regla no se aplica.

export type ReglaGooal = {
  titulo: string
  /** La pregunta que hay que hacerse, en una línea. */
  regla: string
  mal: string
  bien: string
  /**
   * Aclaración para los casos en los que la regla, leída a secas, se aplica mal.
   * Solo la llevan las reglas que han dado problemas de verdad.
   */
  matiz?: string
}

export const REGLAS_GOOAL: ReglaGooal[] = [
  {
    titulo: 'La prueba de la foto',
    regla: '¿Qué foto demuestra esto? Si esa foto podría ser de otras cincuenta cosas, el título está mal.',
    mal: 'Probar un plato que no sabías pronunciar',
    bien: 'Comerte un escorpión',
    // No se juzga si el gooal es impresionante, sino si es reconocible. En
    // comida esa distinción se colaba mal: la IA empezó a señalar medio catálogo
    // de gastronomía por "poco memorable". La línea no está en la forma del
    // título, está dentro del plato.
    matiz: 'En comida, la línea está DENTRO del plato. Vale lo raro, lo extremo o lo difícil de conseguir: '
      + 'un escorpión, fugu, casu marzu, hormigas culonas. Eso se cuenta en una cena y la gente pregunta más. '
      + 'No vale la comida corriente de otro país, por muy extranjera que sea: currywurst, gyros, pasta alla Norma, soba. '
      + 'La pregunta es: ¿esto se lo come cualquiera un martes en ese país, o es una rareza?',
  },
  {
    titulo: 'Concreto, nunca una categoría',
    regla: 'Una cosa que se hace, no un grupo de cosas.',
    mal: 'Probar un deporte que no habías practicado nunca',
    bien: 'Practicar pádel',
  },
  {
    titulo: 'Si hay un sitio con nombre, el sitio es el gooal',
    regla: 'Cuando la gracia está en el lugar, el lugar va en el título con su nombre.',
    mal: 'Desayunar en un mercado',
    bien: 'Visitar el mercado de la Boqueria',
  },
  {
    titulo: 'Sin coletillas de condición',
    regla: 'Nada de "durante 30 días", "delante de desconocidos" o "de más de dos metros".',
    mal: 'Cantar en un karaoke delante de desconocidos',
    bien: 'Cantar en un karaoke',
  },
  {
    titulo: 'El logro nombrable, no el proceso',
    regla: 'Lo que se consigue y se puede decir en voz alta, no el camino.',
    mal: 'Aprender un idioma hasta poder conversar',
    bien: 'Sacarse el C1 de inglés',
  },
]

/**
 * Por encima de las cinco reglas.
 *
 * El catálogo no se llena de cosas fáciles para que los perfiles no estén
 * vacíos: un gooal que no se recuerda tampoco conecta a nadie.
 */
export const PRINCIPIO_GOOAL =
  'Un gooal tiene que ser MEMORABLE, no fácil. Que dos personas hayan aprendido a nadar no las conecta; ' +
  'que las dos hayan hecho el Camino, un 10K o una carrera universitaria, sí. No se baja el listón para llenar perfiles.'

/** El criterio como texto, para meterlo en el prompt de la IA. */
export function criterioParaPrompt(): string {
  const reglas = REGLAS_GOOAL
    .map((r, i) => `${i + 1}. ${r.titulo}: ${r.regla}\n   MAL: "${r.mal}"\n   BIEN: "${r.bien}"`
      + (r.matiz ? `\n   MATIZ: ${r.matiz}` : ''))
    .join('\n')
  return `Reglas de lo que es un buen gooal. Se cumplen TODAS:\n${reglas}\n\nY por encima de las cinco: ${PRINCIPIO_GOOAL}`
}
