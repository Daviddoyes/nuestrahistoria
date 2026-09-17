import type { createServiceRoleClient } from '@/lib/supabase/service'
import type { GooalAdmin, RevisionGooal } from '@/types/gooals'

/**
 * Lo que el panel necesita de un gooal, en UNA consulta.
 *
 * Los dos recuentos y el repaso viajan como recursos incrustados de PostgREST
 * en vez de una consulta por fila:
 *   tenido       cuántas filas de user_gooals tiene (pendiente o conquistado)
 *   conquistado  las mismas, filtradas a 'completado' con .eq desde fuera
 *   revision     la opinión de la IA sobre el título, si ya le ha tocado
 * Se cuenta desde user_gooals y no con veces_completado, que es una copia.
 */
const CAMPOS_REVISION = 'titulo_original, regla, motivo, titulo_propuesto, estado, tipo, titulo_final'
export const COLUMNAS = `*, tenido:user_gooals(count), conquistado:user_gooals(count), revision:gooals_revision(${CAMPOS_REVISION})`

/** Igual, pero deja fuera los que no tienen repaso pendiente. Son los dos filtros del repaso. */
export const COLUMNAS_REPASO = `*, tenido:user_gooals(count), conquistado:user_gooals(count), revision:gooals_revision!inner(${CAMPOS_REVISION})`

/** Sin el repaso. Ver `sinTablaDeRepaso`. */
export const COLUMNAS_SIN_REVISION = '*, tenido:user_gooals(count), conquistado:user_gooals(count)'

/**
 * ¿El error es "la tabla de repaso todavía no está ahí"?
 *
 * Pasa en dos momentos normales: antes de pegar supabase/fase3k.sql, y durante
 * los segundos siguientes, porque PostgREST tarda en enterarse de que existe una
 * tabla nueva. En los dos casos el panel tiene que seguir funcionando sin
 * propuestas, no caerse entero con "No se pudo cargar el catálogo".
 */
export function sinTablaDeRepaso(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  // 42P01 = la tabla no existe · PGRST200 = PostgREST no conoce la relación aún.
  return error.code === '42P01' || error.code === 'PGRST200' || Boolean(error.message?.includes('gooals_revision'))
}

type FilaConRecuentos = Omit<GooalAdmin, 'enListas' | 'conquistados' | 'revision'> & {
  tenido: { count: number }[] | null
  conquistado: { count: number }[] | null
  // PostgREST devuelve objeto cuando la relación es uno a uno (aquí gooal_id es a
  // la vez clave primaria y foránea), pero se acepta también la lista: qué forma
  // toma depende de que detecte bien la relación, y una fila mal leída dejaría
  // sin propuesta a un gooal que sí la tiene.
  revision: RevisionGooal | RevisionGooal[] | null
}

function unaRevision(valor: FilaConRecuentos['revision']): RevisionGooal | null {
  if (!valor) return null
  return Array.isArray(valor) ? valor[0] ?? null : valor
}

export function aGooalAdmin(fila: unknown): GooalAdmin {
  const { tenido, conquistado, revision, ...gooal } = fila as FilaConRecuentos
  return {
    ...gooal,
    enListas: tenido?.[0]?.count ?? 0,
    conquistados: conquistado?.[0]?.count ?? 0,
    revision: unaRevision(revision),
  }
}

/** Relee una fila entera tras cambiarla, para que el panel pinte lo que hay en la base. */
export async function leerFila(
  service: ReturnType<typeof createServiceRoleClient>,
  id: string,
): Promise<GooalAdmin | null> {
  const pedir = (columnas: string) => service
    .from('gooals_v2')
    .select(columnas)
    .eq('conquistado.estado', 'completado')
    .eq('id', id)
    .maybeSingle()

  let { data, error } = await pedir(COLUMNAS)
  if (sinTablaDeRepaso(error)) ({ data, error } = await pedir(COLUMNAS_SIN_REVISION))
  if (error || !data) return null
  return aGooalAdmin(data)
}
