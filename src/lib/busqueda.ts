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
