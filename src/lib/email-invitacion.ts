// El correo de invitación. Vive aquí y no dentro de la ruta para poder verlo y
// probarlo sin mandarlo.

import type { PartesCorreo } from '@/lib/email-plantilla'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gooals.app'

/**
 * La invitación, con LA plantilla de la marca (la misma que las campañas del
 * panel): fondo claro y la paleta definitiva. Es el primer correo que ve alguien
 * de GooALS, así que no puede tener otro estilo.
 *
 * Sin enlace de baja a propósito: quien lo recibe todavía no tiene cuenta, así
 * que no hay nada de lo que darse de baja. El pie dice qué hacer si no conoce a
 * quien le invita.
 */
export function partesInvitacion(nombreInvitador: string, token: string): PartesCorreo {
  return {
    asunto: `${nombreInvitador} te invita a unirse a GooALS`,
    titular: `${nombreInvitador} quiere que vivas más.`,
    parrafos: [
      'Te ha invitado a unirte a GooALS, la app para convertir tus intenciones en recuerdos. Crea tu lista de retos, vívelos y compártelos.',
    ],
    boton: { texto: 'Unirme a GooALS', url: `${APP_URL}/invite/${token}` },
    pie: { texto: `Si no conoces a ${nombreInvitador}, ignora este mensaje.` },
  }
}
