// Leer una tabla entera cuando puede tener más de 1.000 filas.
//
// ── POR QUÉ ESTO EXISTE ───────────────────────────────────
//
// PostgREST, que es lo que hay entre la app y Postgres, devuelve como mucho
// 1.000 filas por consulta. **No avisa**: no da error, no recorta con un aviso,
// simplemente te manda las mil primeras como si fueran todas. Un `.select()`
// sin `.range()` sobre una tabla que crece es una bomba de relojería que estalla
// el día que la tabla pasa de mil, y lo que se ve entonces no es un fallo: son
// números que han dejado de cuadrar.
//
// Ya rompió Explorar una vez.
//
// Vive en su propio fichero porque había DOS copias de este bucle en el repo y
// la tercera estaba a punto de escribirse. La regla del repo es que la segunda
// copia ya es la señal: una lección escrita no se aplica sola, un módulo sí.

/** Lo máximo que devuelve PostgREST de una vez. Si se pide más, corta en silencio. */
const FILAS_POR_VUELTA = 1000

/**
 * Lee una consulta entera, de 1.000 en 1.000.
 *
 * Quien llama debe ordenar por algo único (normalmente `id`): **sin un orden
 * estable, dos vueltas pueden repetir una fila o saltarse otra**, y eso no se
 * nota mirando el resultado.
 *
 * Si una vuelta falla se lanza el error en vez de devolver lo leído hasta ahí:
 * un perfil con la mitad de sus gooals, o un "0 en común" por un fallo de red,
 * es un dato falso que nadie detectaría.
 */
export async function leerTodo<T>(
  etiqueta: string,
  pedir: (desde: number, hasta: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>
): Promise<T[]> {
  const filas: T[] = []
  for (let desde = 0; ; desde += FILAS_POR_VUELTA) {
    const { data, error } = await pedir(desde, desde + FILAS_POR_VUELTA - 1)
    if (error) {
      console.error(`[${etiqueta}]`, error)
      throw new Error(`No se pudo leer ${etiqueta}`)
    }
    const vuelta = (data ?? []) as T[]
    filas.push(...vuelta)
    if (vuelta.length < FILAS_POR_VUELTA) return filas
  }
}
