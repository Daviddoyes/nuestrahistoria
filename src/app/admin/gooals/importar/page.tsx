import ImportarCsv from '@/components/admin/catalogo/ImportarCsv'

export const metadata = { title: 'Importar CSV · gooals admin' }

/**
 * Importación masiva de gooals desde un CSV.
 *
 * El layout de /admin ya decide si se pinta. No lee datos al cargar: lo hacen
 * las dos Server Actions de acciones.ts, y cada una comprueba esAdmin() por su
 * cuenta, porque se pueden llamar sin pasar por esta página.
 */
export default function ImportarCsvPage() {
  return <ImportarCsv />
}
