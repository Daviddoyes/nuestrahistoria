import { createHmac, timingSafeEqual } from 'node:crypto'

export const CAMPANA_RELANZAMIENTO = 'relanzamiento'

export const ASUNTO_RELANZAMIENTO = 'Voy a actualizar GooALS'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gooals.app'

/**
 * Firma del enlace de baja.
 *
 * Va firmado para que nadie pueda dar de baja a otra persona cambiando el id
 * en la URL. Se reutiliza el mismo secreto que el portal de /cuenta.
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

/** Nombre de pila, que es como se dirige uno a alguien en un correo. */
function primerNombre(nombre: string | null, email: string): string {
  const limpio = (nombre ?? '').trim()
  if (limpio) return limpio.split(/\s+/)[0]
  return email.split('@')[0]
}

/** Fecha como se dice en voz alta: "el viernes 4 de septiembre". */
export function fechaLarga(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  const dia = d.toLocaleDateString('es-ES', { weekday: 'long' })
  const resto = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
  return `${dia} ${resto}`
}

/**
 * El correo que se manda a los usuarios que ya estaban registrados.
 *
 * Va firmado por David en primera persona a propósito: son 52 personas que
 * probaron la app cuando no era casi nada, y un "el equipo de GooALS" a esa
 * escala suena a circular.
 */
export function htmlRelanzamiento(
  nombre: string | null,
  email: string,
  userId: string,
  fechaBorrado: string,
): string {
  const hola = primerNombre(nombre, email)
  const fecha = fechaLarga(fechaBorrado)

  return `<div style="font-family: Inter, system-ui, -apple-system, sans-serif; max-width: 520px; margin: 0 auto; background: #0B0B0B; color: #FFFFFF; padding: 44px 32px;">
  <p style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #00D1A7; margin: 0 0 32px 0;">GooALS</p>

  <p style="font-size: 16px; line-height: 1.7; color: #E0E0E0; margin: 0 0 20px 0;">Hola ${hola},</p>

  <p style="font-size: 16px; line-height: 1.7; color: #C0C0C0; margin: 0 0 20px 0;">
    Te escribo porque hace un tiempo te diste de alta en GooALS. Gracias por
    probarlo cuando no era casi nada — eso se agradece más de lo que parece.
  </p>

  <p style="font-size: 16px; line-height: 1.7; color: #C0C0C0; margin: 0 0 20px 0;">
    Llevo un tiempo trabajando en una actualización grande, y la app va a cambiar
    por completo. Deja de ir de organizar planes con gente y pasa a ser una lista
    de casi 5.000 retos —viajes, deporte, gastronomía, cultura, música y
    aventura— que vas marcando cuando los haces. Cada uno suma puntos según lo
    que cueste, subes de nivel, y lo que completas aparece en un muro que ven
    quienes te siguen.
  </p>

  <div style="border-left: 2px solid #C97B7B; padding-left: 18px; margin: 0 0 28px 0;">
    <p style="font-size: 15px; line-height: 1.7; color: #C0C0C0; margin: 0 0 14px 0;">
      <strong style="color: #FFFFFF;">Con el cambio desaparece todo lo de la
      versión anterior:</strong> los planes que creaste y las historias que
      completaste. Lo guardo hasta el <strong style="color: #FFFFFF;">${fecha}</strong>;
      a partir de ahí se borra de forma definitiva.
    </p>
    <p style="font-size: 15px; line-height: 1.7; color: #C0C0C0; margin: 0;">
      Si hay algo que quieras conservar, respóndeme a este correo antes de esa
      fecha y te lo mando.
    </p>
  </div>

  <p style="font-size: 16px; line-height: 1.7; color: #C0C0C0; margin: 0 0 8px 0;">
    Tu cuenta no se toca. Cuando la nueva versión esté lista te escribo, y entras
    con tu email y tu contraseña de siempre.
  </p>

  <p style="font-size: 16px; line-height: 1.7; color: #C0C0C0; margin: 24px 0 0 0;">David</p>

  <p style="font-size: 12px; color: #555; margin: 40px 0 0 0; line-height: 1.7; border-top: 1px solid #2A2E2C; padding-top: 20px;">
    Recibes esto porque tienes una cuenta en GooALS.
    <a href="${enlaceBaja(userId)}" style="color: #777;">No quiero más correos</a>.
  </p>
</div>`
}
