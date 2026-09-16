// De quién salen los correos de GooALS.
//
// LA DIRECCIÓN es la misma en todos: hola@gooals.app, que recibe correo de
// verdad. Si alguien responde a una invitación o a una campaña, la respuesta le
// llega a David. Nada de no-reply.
//
// EL NOMBRE que se ve NO es el mismo, y no debe serlo:
//   · una campaña la escribe David, y firma "David de GooALS";
//   · una invitación la manda el usuario que invita, y su nombre ya va en el
//     asunto ("Marta te invita a unirse a GooALS"). Firmarla "David de GooALS"
//     mezclaría dos personas en el mismo correo.

const POR_DEFECTO = 'hola@gooals.app'

/**
 * Admite "hola@gooals.app" o "Nombre <hola@gooals.app>" en RESEND_FROM_EMAIL.
 * Si lo que hay ahí no parece una dirección, se usa la de siempre: un remitente
 * inventado haría que Resend rechazara TODOS los correos.
 */
function direccionDe(valor: string | undefined): string {
  const entreAngulos = valor?.match(/<([^>]+)>/)
  const direccion = (entreAngulos ? entreAngulos[1] : valor ?? '').trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(direccion) ? direccion : POR_DEFECTO
}

export const DIRECCION_REMITENTE = direccionDe(process.env.RESEND_FROM_EMAIL)

/** Los correos que escribe David desde el panel. */
export const REMITENTE_CAMPANAS = `David de GooALS <${DIRECCION_REMITENTE}>`

/** Las invitaciones, que manda un usuario cualquiera. */
export const REMITENTE_INVITACIONES = `GooALS <${DIRECCION_REMITENTE}>`
