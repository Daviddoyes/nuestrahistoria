'use server'

import { revalidatePath } from 'next/cache'
import { esAdmin } from '@/lib/admin-auth'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

/** Marca o desmarca a alguien como administrador. */
export async function cambiarAdmin(userId: string, admin: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!await esAdmin()) return { ok: false, error: 'Esta cuenta no tiene acceso al panel.' }
  if (typeof userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(userId) || typeof admin !== 'boolean') {
    return { ok: false, error: 'Petición no válida.' }
  }

  // No se puede quitar el admin a uno mismo. Así nadie se deja fuera del panel
  // sin querer, y siempre queda al menos un administrador: el que pulsa.
  const supa = await createServerClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!admin && user?.id === userId) {
    return { ok: false, error: 'No puedes quitarte el admin a ti mismo. Pídeselo a otro administrador.' }
  }

  const service = createServiceRoleClient()
  const { data, error } = await service.from('profiles').update({ es_admin: admin }).eq('id', userId).select('id')
  if (error) {
    console.error('[admin/usuarios] cambiarAdmin', error)
    return { ok: false, error: 'No se pudo guardar. Inténtalo de nuevo.' }
  }
  // Una cuenta sin perfil no tiene dónde guardar la marca: se dice, en vez de dar un falso "hecho".
  if (!data || data.length === 0) return { ok: false, error: 'Esa cuenta no tiene perfil: no se puede marcar como admin.' }

  revalidatePath('/admin/usuarios')
  return { ok: true }
}
