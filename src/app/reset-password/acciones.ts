'use server'

import { cookies } from 'next/headers'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { COOKIE_RECUPERACION, permisoValido } from '@/lib/recuperacion'

const MINIMO = 6

/**
 * Cambia la contraseña de quien ha llegado por un enlace válido.
 *
 * Se vuelve a comprobar el permiso aquí, no solo al pintar la página: una acción
 * de servidor se puede llamar sin pasar por la pantalla.
 *
 * Al terminar cierra las demás sesiones de esa cuenta. Si alguien había entrado
 * con la contraseña vieja (el caso por el que se cambia una contraseña), deja de
 * estar dentro.
 */
export async function cambiarContrasena(contrasena: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (typeof contrasena !== 'string' || contrasena.length < MINIMO) {
    return { ok: false, error: `La contraseña necesita al menos ${MINIMO} caracteres.` }
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'El enlace ya no vale. Pide otro y vuelve a intentarlo.' }

  const galleta = await cookies()
  if (!permisoValido(galleta.get(COOKIE_RECUPERACION)?.value, user.id)) {
    return { ok: false, error: 'El enlace ya no vale. Pide otro y vuelve a intentarlo.' }
  }

  const { error } = await supabase.auth.updateUser({ password: contrasena })
  if (error) {
    console.error('[reset-password] updateUser', error.message)
    return { ok: false, error: 'No se ha podido guardar la contraseña. Inténtalo de nuevo.' }
  }

  // El permiso se gasta: si alguien vuelve atrás en el navegador, ya no vale.
  galleta.delete(COOKIE_RECUPERACION)

  const { error: errorSesiones } = await supabase.auth.signOut({ scope: 'others' })
  // La contraseña YA está cambiada: si esto falla, no se deshace nada, pero se avisa.
  if (errorSesiones) console.error('[reset-password] cerrar otras sesiones', errorSesiones.message)

  return { ok: true }
}
