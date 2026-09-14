import { createClient as createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

/**
 * ¿La sesión que hace esta petición es de un administrador?
 *
 * Antes esto era una contraseña compartida (`ADMIN_KEY`) que el panel mandaba
 * en una cabecera. Como el panel es un componente de cliente, esa contraseña
 * viajaba en el bundle: cualquiera podía leerla en las devtools y llamar a
 * /api/admin/* — incluido /api/admin-stats, que devuelve el email de todos los
 * usuarios.
 *
 * Ahora se comprueba en el servidor contra `profiles.es_admin`, que el cliente
 * nunca ve. La sesión viaja en la cookie, así que las llamadas del panel no
 * tienen que mandar nada: basta con que sean del mismo origen.
 *
 * Se marca a alguien como admin desde el SQL Editor (ver supabase/fase3c.sql).
 */
export async function esAdmin(): Promise<boolean> {
  const supa = await createServerClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return false

  // La lectura va con el service role porque profiles no expone es_admin por RLS.
  const service = createServiceRoleClient()
  const { data, error } = await service
    .from('profiles')
    .select('es_admin')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('[esAdmin]', error)
    return false
  }
  return Boolean((data as { es_admin?: boolean } | null)?.es_admin)
}
