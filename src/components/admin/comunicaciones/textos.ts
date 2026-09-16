// Frases que comparten el editor y el historial de Comunicaciones.

import type { RecuentoGrupo } from '@/lib/comunicaciones'
import type { ResultadoAccionEnvio } from '@/app/admin/comunicaciones/acciones'

/** "41 destinatarios · 3 excluidos porque se dieron de baja". */
export const recuentoTexto = (r: RecuentoGrupo) =>
  `${r.destinatarios.toLocaleString('es-ES')} ${r.destinatarios === 1 ? 'destinatario' : 'destinatarios'}` +
  (r.excluidos > 0 ? ` · ${r.excluidos.toLocaleString('es-ES')} ${r.excluidos === 1 ? 'excluido porque se dio de baja' : 'excluidos porque se dieron de baja'}` : '')

/** El aviso de después de un envío o de un reintento. */
export function resumenEnvio(r: Extract<ResultadoAccionEnvio, { ok: true }>): { bien: boolean; texto: string } {
  const fallidos = r.fallidos > 0 ? ` ${r.fallidos} sin confirmar.` : ''
  return r.error
    ? { bien: false, texto: `Se cortó: han salido ${r.enviados} de ${r.destinatarios}.${fallidos} Motivo: ${r.error} Puedes reanudarlo desde el historial: no se repetirá a nadie.` }
    : { bien: true, texto: `Enviado a ${r.enviados} ${r.enviados === 1 ? 'persona' : 'personas'} ✓${fallidos}` }
}
