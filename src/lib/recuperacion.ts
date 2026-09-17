// El permiso para cambiar la contraseña. Solo servidor (usa node:crypto).
//
// Tener sesión NO basta para abrir /reset-password: cualquiera con la sesión
// abierta en un móvil prestado podría cambiar la contraseña. Hace falta haber
// llegado por un enlace válido del correo, y eso es lo que marca esta cookie:
// la pone /auth/confirm justo después de verificar el enlace contra Supabase, y
// se borra en cuanto la contraseña cambia.

import { createHmac, timingSafeEqual } from 'node:crypto'

export const COOKIE_RECUPERACION = 'gooals-recuperacion'
/** Lo que dura el permiso. Lo normal es cambiarla en un minuto; una hora sobra. */
export const MINUTOS_RECUPERACION = 60

const secreto = () => process.env.EMAIL_VERIFICATION_SECRET ?? ''

const firma = (userId: string, caduca: number) =>
  createHmac('sha256', secreto()).update(`recuperacion:${userId}:${caduca}`).digest('hex').slice(0, 32)

/** El valor de la cookie: para quién vale y hasta cuándo, firmado. */
export function valeParaRecuperar(userId: string): string {
  const caduca = Date.now() + MINUTOS_RECUPERACION * 60 * 1000
  return `${caduca}.${firma(userId, caduca)}`
}

/**
 * ¿Esta cookie da permiso a ESTE usuario ahora mismo?
 *
 * Va firmada con el secreto del servidor: sin él no se puede fabricar. Y lleva
 * dentro el id del usuario, así que la de una persona no sirve para otra.
 */
export function permisoValido(valor: string | undefined, userId: string): boolean {
  if (!valor) return false
  const [caducaTexto, recibida = ''] = valor.split('.')
  const caduca = Number(caducaTexto)
  if (!Number.isFinite(caduca) || caduca < Date.now()) return false

  const esperada = Buffer.from(firma(userId, caduca))
  const buffer = Buffer.from(recibida)
  // Comparación en tiempo constante: con === se puede adivinar la firma a base de probar.
  if (esperada.length !== buffer.length) return false
  return timingSafeEqual(esperada, buffer)
}

/** Opciones de la cookie. httpOnly: el navegador la manda, pero ningún script la lee. */
export const opcionesCookieRecuperacion = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MINUTOS_RECUPERACION * 60,
}
