import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { COOKIE_RECUPERACION, permisoValido } from '@/lib/recuperacion'
import FormularioContrasena from '@/components/FormularioContrasena'

export const metadata = { title: 'Nueva contraseña · gooals' }

/**
 * Elegir contraseña nueva.
 *
 * Aquí no se llega escribiendo la dirección: hace falta el permiso que deja
 * /auth/confirm tras verificar el enlace del correo. Sin él, se va a la pantalla
 * que explica que el enlace ya no vale y deja pedir otro.
 */
export default async function ResetPasswordPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const galleta = await cookies()

  if (!user || !permisoValido(galleta.get(COOKIE_RECUPERACION)?.value, user.id)) {
    redirect('/enlace-caducado')
  }

  return <FormularioContrasena />
}
