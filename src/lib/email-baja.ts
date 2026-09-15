// Enlace de baja de los correos. Vive aparte de cualquier campaña: todo correo
// que se mande a usuarios tiene que llevarlo, y /api/baja lo comprueba.

import { createHmac, timingSafeEqual } from 'node:crypto'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gooals.app'

/**
 * Firma del enlace de baja.
 *
 * Va firmado para que nadie pueda dar de baja a otra persona cambiando el id
 * en la URL. Se reutiliza el mismo secreto que el portal de /cuenta.
 *
 * No cambies el formato ("baja:<id>", 32 caracteres): los correos ya enviados
 * llevan enlaces firmados así, y dejarían de funcionar.
 */
export function firmaBaja(userId: string): string {
  const secreto = process.env.EMAIL_VERIFICATION_SECRET ?? ''
  return createHmac('sha256', secreto).update(`baja:${userId}`).digest('hex').slice(0, 32)
}

export function firmaBajaValida(userId: string, firma: string): boolean {
  const esperada = Buffer.from(firmaBaja(userId))
  const recibida = Buffer.from(firma)
  // Comparación en tiempo constante: comparar con === filtra por longitud y
  // por prefijo, y eso es suficiente para adivinar una firma a base de probar.
  if (esperada.length !== recibida.length) return false
  return timingSafeEqual(esperada, recibida)
}

export function enlaceBaja(userId: string): string {
  return `${APP_URL}/api/baja?u=${userId}&t=${firmaBaja(userId)}`
}
