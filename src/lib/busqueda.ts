// Compartido por el catálogo de la app (actions.ts) y el panel de admin: buscar
// lo mismo tiene que devolver lo mismo en los dos sitios.

/**
 * Limpia el texto del buscador antes de meterlo en un ilike.
 *
 * Los comodines de LIKE y los caracteres con los que PostgREST delimita los
 * filtros se quitan: en un título no aportan nada y evitan que un "%" suelto
 * convierta la búsqueda en "trae cualquier cosa". La usan la lista, el mapa y
 * el panel de admin, para que buscar lo mismo devuelva lo mismo en todos.
 */
export function limpiarBusqueda(texto: string | undefined): string {
  return (texto ?? '').replace(/[%_\\,()"']/g, ' ').trim()
}

/**
 * Lo mismo, pero para buscar PERSONAS, donde el guion bajo no es un comodín:
 * es la mitad de los @usuarios que hay.
 *
 * `limpiarBusqueda` se come el `_` porque en LIKE significa «un carácter
 * cualquiera» y en un título de gooal no aporta nada. Aquí sí aporta: teclear
 * «adolfo_gs» entero tiene que encontrar a `adolfo_gs`, y con el otro
 * limpiador devolvía CERO resultados — el `_` se convertía en un espacio y el
 * patrón pasaba a ser «adolfo gs», que no existe.
 *
 * Así que el `_` y el `%` se ESCAPAN en vez de quitarse (con `\`, que es el
 * escape por defecto de LIKE en Postgres), y solo se van los caracteres con
 * los que PostgREST delimita un filtro `or`: ahí una coma o un paréntesis no
 * son texto, son sintaxis, y un paréntesis suelto rompe la consulta entera.
 */
export function limpiarBusquedaPersonas(texto: string | undefined): string {
  return (texto ?? '')
    .replace(/[\\,()"']/g, ' ')
    .replace(/[%_]/g, c => '\\' + c)
    .trim()
}
