// Envío de campañas de correo y su historial. SOLO SERVIDOR: service role y la
// clave de Resend. Lo usan las Server Actions de /admin/comunicaciones, que
// comprueban esAdmin() antes de llamar a nada de aquí.

import { createHash } from 'node:crypto'
import { Resend } from 'resend'
import { cuentasAuth, leerTodo, type Servicio } from '@/lib/admin-datos'
import { enlaceBaja } from '@/lib/email-baja'
import { REMITENTE_CAMPANAS } from '@/lib/email-remitente'
import {
  GRUPOS, htmlCorreo, normalizarContenido, textoCorreo, type ContenidoCorreo, type GrupoCorreo,
} from '@/lib/email-plantilla'

/** Correos por petición a Resend. Es el máximo de su envío por lotes. */
const POR_LOTE = 100
/**
 * Pausa entre lotes. Resend admite 2 peticiones por segundo en el plan base:
 * con 600 ms entre una y otra no se llega nunca al límite.
 */
const PAUSA_MS = 600
/** Resend recuerda una clave de idempotencia 24 h. Se deja 1 h de margen. */
const VIDA_CLAVE_MS = 23 * 60 * 60 * 1000
/** Un envío que lleva este tiempo sin avanzar se ha cortado (la función se paró a mitad). */
export const ENVIO_PARADO_MS = 15 * 60 * 1000
const ACTIVO_MS = 30 * 24 * 60 * 60 * 1000

const espera = (ms: number) => new Promise(r => setTimeout(r, ms))

// ── Grupos ────────────────────────────────────────────────────────

export type Destinatario = { id: string; email: string }
export type RecuentoGrupo = { grupo: GrupoCorreo; destinatarios: number; excluidos: number }

/**
 * Los destinatarios de los cuatro grupos, calculados ahora mismo.
 *
 * Se parte de auth.users (donde está el email y el último acceso) y se cruza con
 * profiles (la baja y el onboarding). Una cuenta sin perfil no se ha dado de
 * baja, y no ha terminado el onboarding.
 */
export async function calcularGrupos(service: Servicio): Promise<Record<GrupoCorreo, { destinatarios: Destinatario[]; excluidos: number }>> {
  const [cuentas, perfiles] = await Promise.all([
    cuentasAuth(service),
    leerTodo<{ id: string; acepta_emails: boolean | null; onboarding_completado: boolean | null }>(
      (desde, hasta) => service.from('profiles').select('id, acepta_emails, onboarding_completado').order('id').range(desde, hasta),
    ),
  ])
  const perfilPorId = new Map(perfiles.map(p => [p.id, p]))
  const ahora = Date.now()

  const grupos = Object.fromEntries(GRUPOS.map(g => [g.id, { destinatarios: [] as Destinatario[], excluidos: 0 }])) as
    Record<GrupoCorreo, { destinatarios: Destinatario[]; excluidos: number }>

  for (const c of cuentas) {
    if (!c.email) continue
    const p = perfilPorId.get(c.id)
    const activo = Boolean(c.last_sign_in_at && ahora - new Date(c.last_sign_in_at).getTime() <= ACTIVO_MS)
    const deGrupos: GrupoCorreo[] = ['todos', activo ? 'activos' : 'inactivos']
    if (p?.onboarding_completado !== true) deGrupos.push('sin_onboarding')

    // La baja manda sobre todo: quien la pidió no entra en ningún grupo.
    const deBaja = p?.acepta_emails === false
    for (const g of deGrupos) {
      if (deBaja) grupos[g].excluidos++
      else grupos[g].destinatarios.push({ id: c.id, email: c.email })
    }
  }
  // Orden fijo por id: los lotes salen siempre iguales, y eso es lo que permite
  // reenviar un lote cortado con la misma clave de idempotencia.
  for (const g of Object.values(grupos)) g.destinatarios.sort((a, b) => a.id.localeCompare(b.id))
  return grupos
}

export async function recuentoGrupos(service: Servicio): Promise<RecuentoGrupo[]> {
  const grupos = await calcularGrupos(service)
  return GRUPOS.map(g => ({ grupo: g.id, destinatarios: grupos[g.id].destinatarios.length, excluidos: grupos[g.id].excluidos }))
}

// ── Historial ─────────────────────────────────────────────────────

export type CampanaHistorial = {
  id: string
  asunto: string
  cuerpo: string
  botonTexto: string
  botonUrl: string
  grupo: GrupoCorreo
  destinatarios: number
  enviados: number
  fallidos: number
  estado: 'borrador' | 'enviando' | 'enviado' | 'fallido'
  creadoEn: string
  enviadoEn: string | null
  /** 'enviando' sin moverse desde hace un rato: se cortó y se puede reanudar. */
  parado: boolean
  /** Personas cuya fila existe pero nunca se confirmó que el correo saliera. */
  sinConfirmar: number
}

export type CampanaAnterior = { campana: string; fecha: string; enviados: number; fallidos: number }

/** Hasta dónde se enseña el historial. Si algún día hay más campañas que esto, se pagina. */
const MAX_CAMPANAS = 200

export async function leerHistorial(service: Servicio): Promise<{ campanas: CampanaHistorial[]; anteriores: CampanaAnterior[] }> {
  const [{ data, error }, sueltos, noConfirmados] = await Promise.all([
    service.from('emails_campanas')
      .select('id, asunto, cuerpo, boton_texto, boton_url, grupo, destinatarios, enviados, fallidos, estado, creado_en, enviado_en')
      .order('creado_en', { ascending: false })
      .order('id')
      .range(0, MAX_CAMPANAS - 1),
    // Los envíos de antes de que existieran las campañas (el relanzamiento): sin
    // campana_id. Se enseñan agrupados por su nombre, no se esconden.
    leerTodo<{ campana: string; estado: string; created_at: string }>(
      (desde, hasta) => service.from('emails_enviados').select('id, campana, estado, created_at').is('campana_id', null).order('id').range(desde, hasta),
    ),
    // Solo las que NO están confirmadas: son las pocas, y así no se trae el registro entero.
    leerTodo<{ campana_id: string }>(
      (desde, hasta) => service.from('emails_enviados').select('id, campana_id').neq('estado', 'enviado').not('campana_id', 'is', null).order('id').range(desde, hasta),
    ),
  ])
  if (error) throw new Error(error.message)

  const ahora = Date.now()
  const pendientesPorCampana = new Map<string, number>()
  for (const n of noConfirmados) pendientesPorCampana.set(n.campana_id, (pendientesPorCampana.get(n.campana_id) ?? 0) + 1)

  const campanas = (data ?? []).map(f => ({
    id: f.id as string,
    asunto: f.asunto as string,
    cuerpo: f.cuerpo as string,
    botonTexto: (f.boton_texto as string | null) ?? '',
    botonUrl: (f.boton_url as string | null) ?? '',
    grupo: f.grupo as GrupoCorreo,
    destinatarios: f.destinatarios as number,
    enviados: f.enviados as number,
    fallidos: f.fallidos as number,
    estado: f.estado as CampanaHistorial['estado'],
    creadoEn: f.creado_en as string,
    enviadoEn: (f.enviado_en as string | null) ?? null,
    parado: f.estado === 'enviando' && Boolean(f.enviado_en) && ahora - new Date(f.enviado_en as string).getTime() > ENVIO_PARADO_MS,
    sinConfirmar: pendientesPorCampana.get(f.id as string) ?? 0,
  }))

  const porCampana = new Map<string, CampanaAnterior>()
  for (const s of sueltos) {
    const a = porCampana.get(s.campana) ?? { campana: s.campana, fecha: s.created_at, enviados: 0, fallidos: 0 }
    if (s.created_at < a.fecha) a.fecha = s.created_at
    if (s.estado === 'enviado') a.enviados++
    else a.fallidos++
    porCampana.set(s.campana, a)
  }
  return { campanas, anteriores: [...porCampana.values()].sort((a, b) => b.fecha.localeCompare(a.fecha)) }
}

// ── Envío ─────────────────────────────────────────────────────────

export const contenidoDeFila = (f: { asunto: string; cuerpo: string; boton_texto: string | null; boton_url: string | null }): ContenidoCorreo =>
  normalizarContenido({ asunto: f.asunto, cuerpo: f.cuerpo, botonTexto: f.boton_texto ?? '', botonUrl: f.boton_url ?? '' })

const nombreCampana = (id: string) => `campana:${id}`

/** El correo de una persona: el enlace de baja va firmado con su id. */
function correoPara(contenido: ContenidoCorreo, d: Destinatario) {
  const baja = enlaceBaja(d.id)
  return {
    from: REMITENTE_CAMPANAS,
    to: d.email,
    subject: contenido.asunto,
    html: htmlCorreo(contenido, { enlaceBaja: baja }),
    text: textoCorreo(contenido, baja),
    // Gmail y Outlook enseñan un "Cancelar suscripción" junto al remitente con esto.
    headers: { 'List-Unsubscribe': `<${baja}>` },
  }
}

/**
 * Errores con los que Resend dice claramente que NO ha mandado nada: se puede
 * volver a intentar sin miedo. Cualquier otro (un corte de red, un error interno)
 * deja la duda de si salió, y ese lote se trata como "sin confirmar".
 */
const RECHAZOS_SEGUROS = new Set([
  'validation_error', 'missing_required_field', 'invalid_parameter', 'invalid_from_address',
  'missing_api_key', 'invalid_api_key', 'restricted_api_key', 'invalid_access', 'security_error',
  'daily_quota_exceeded', 'monthly_quota_exceeded', 'rate_limit_exceeded',
  // Sin 'concurrent_idempotent_requests': significa que OTRA petición igual está en marcha y puede salir.
  'invalid_idempotency_key', 'invalid_idempotent_request',
])

type ResultadoLote = { ok: true } | { ok: false; seguroQueNoSalio: boolean; mensaje: string }

/**
 * Manda un lote. La clave de idempotencia sale de la campaña y de las personas
 * del lote: si el mismo lote se reenvía en menos de 24 h (un reintento tras un
 * corte), Resend lo reconoce y no lo manda otra vez.
 */
async function mandarLote(resend: Resend, campanaId: string, contenido: ContenidoCorreo, lote: Destinatario[], sufijo = ''): Promise<ResultadoLote> {
  const huella = createHash('sha256').update(lote.map(d => d.id).join(',')).digest('hex').slice(0, 40)
  const idempotencyKey = `gooals-${campanaId}-${sufijo}${huella}`

  for (let intento = 1; ; intento++) {
    try {
      const { error } = await resend.batch.send(lote.map(d => correoPara(contenido, d)), { idempotencyKey })
      if (!error) return { ok: true }
      // Límite de peticiones: no se ha mandado nada. Se espera y se repite con la misma clave.
      if (error.name === 'rate_limit_exceeded' && intento < 4) { await espera(1500 * intento); continue }
      return { ok: false, seguroQueNoSalio: RECHAZOS_SEGUROS.has(error.name), mensaje: error.message }
    } catch (e) {
      return { ok: false, seguroQueNoSalio: false, mensaje: e instanceof Error ? e.message : 'Error de conexión con Resend' }
    }
  }
}

export type ResultadoEnvio = {
  enviados: number
  fallidos: number
  destinatarios: number
  /** null si terminó bien. */
  error: string | null
}

/**
 * Cierra una campaña y cuadra sus números.
 *
 * Los cuenta desde emails_enviados y no sumando sobre la marcha: así cuadran
 * aunque haya habido cortes y reintentos por medio.
 */
async function cerrarCampana(service: Servicio, campanaId: string, destinatarios: number, error: string | null): Promise<ResultadoEnvio> {
  const filas = await leerTodo<{ estado: string }>(
    (desde, hasta) => service.from('emails_enviados').select('id, estado').eq('campana_id', campanaId).order('id').range(desde, hasta),
  )
  const enviados = filas.filter(f => f.estado === 'enviado').length
  const fallidos = filas.filter(f => f.estado !== 'enviado').length
  const { error: errorCierre } = await service.from('emails_campanas').update({
    estado: error ? 'fallido' : 'enviado', enviados, fallidos, destinatarios, enviado_en: new Date().toISOString(),
  }).eq('id', campanaId)
  if (errorCierre) console.error('[comunicaciones] cerrar campaña', campanaId, errorCierre)
  return { enviados, fallidos, destinatarios, error }
}

/** Los que quedaron SIN CONFIRMAR: su fila existe pero nunca llegó a marcarse como enviada. */
export async function sinConfirmarDe(service: Servicio, campanaId: string) {
  return leerTodo<{ user_id: string; email: string; estado: string; created_at: string }>(
    (desde, hasta) => service.from('emails_enviados').select('id, user_id, email, estado, created_at')
      .eq('campana_id', campanaId).neq('estado', 'enviado').order('id').range(desde, hasta),
  )
}

/**
 * Reenvía SOLO a los que quedaron sin confirmar, porque lo pide el admin.
 *
 * Es un envío nuevo a propósito: la clave lleva la fecha, así que Resend no lo
 * confunde con el lote original y estos correos salen de verdad. A quien ya le
 * hubiera llegado le llegará dos veces; por eso lo decide una persona viendo la
 * cifra, y no el programa por su cuenta.
 */
export async function reenviarSinConfirmar(service: Servicio, campanaId: string, contenido: ContenidoCorreo, destinatarios: number): Promise<ResultadoEnvio> {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const pendientes = (await sinConfirmarDe(service, campanaId))
    .map(f => ({ id: f.user_id, email: f.email }))
    .sort((a, b) => a.id.localeCompare(b.id))
  if (pendientes.length === 0) return cerrarCampana(service, campanaId, destinatarios, null)

  const sufijo = `reenvio-${new Date().toISOString().slice(0, 10)}-`
  for (let i = 0; i < pendientes.length; i += POR_LOTE) {
    const lote = pendientes.slice(i, i + POR_LOTE)
    const r = await mandarLote(resend, campanaId, contenido, lote, sufijo)
    if (!r.ok) return cerrarCampana(service, campanaId, destinatarios, r.mensaje)
    const { error } = await service.from('emails_enviados').update({ estado: 'enviado', error: null })
      .eq('campana_id', campanaId).in('user_id', lote.map(d => d.id))
    if (error) return cerrarCampana(service, campanaId, destinatarios, `Los correos salieron, pero no se pudo apuntar: ${error.message}`)
    if (i + POR_LOTE < pendientes.length) await espera(PAUSA_MS)
  }
  return cerrarCampana(service, campanaId, destinatarios, null)
}

/**
 * Manda la campaña a sus destinatarios. La campaña YA tiene que estar en
 * 'enviando' (lo pone quien llama, antes de llamar).
 *
 * Por cada lote: primero se apunta a cada persona en emails_enviados, luego se
 * manda y luego se marca como enviado. El índice único (user_id, campana) hace
 * que nadie pueda apuntarse dos veces, ni aunque se lancen dos envíos a la vez.
 */
export async function repartirCampana(service: Servicio, campanaId: string, contenido: ContenidoCorreo, destinatarios: Destinatario[]): Promise<ResultadoEnvio> {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const campana = nombreCampana(campanaId)

  const registrados = await leerTodo<{ user_id: string; email: string; estado: string; created_at: string }>(
    (desde, hasta) => service.from('emails_enviados').select('id, user_id, email, estado, created_at').eq('campana_id', campanaId).order('id').range(desde, hasta),
  )

  const terminar = (error: string | null) => cerrarCampana(service, campanaId, destinatarios.length, error)

  const latido = () => service.from('emails_campanas').update({ enviado_en: new Date().toISOString() }).eq('id', campanaId)

  // ── 1. Lo que quedó a medias en un corte anterior ──
  // Filas 'enviando' = lote del que no se supo si salió. Con menos de 24 h se
  // reenvía con la misma clave (Resend no lo duplica); con más, ya no hay
  // garantía y no se toca: mejor que a alguien no le llegue que le llegue dos veces.
  const dudosos = registrados.filter(r => r.estado === 'enviando').sort((a, b) => a.user_id.localeCompare(b.user_id))
  if (dudosos.length > 0) {
    const caducados = dudosos.filter(d => Date.now() - new Date(d.created_at).getTime() > VIDA_CLAVE_MS)
    if (caducados.length > 0) {
      await service.from('emails_enviados')
        .update({ estado: 'error', error: 'Sin confirmar: el envío se cortó hace más de 24 h y no se reintenta para no mandarlo dos veces.' })
        .eq('campana_id', campanaId).in('user_id', caducados.map(c => c.user_id))
    }
    const vigentes = dudosos.filter(d => !caducados.includes(d))
    for (let i = 0; i < vigentes.length; i += POR_LOTE) {
      const lote = vigentes.slice(i, i + POR_LOTE).map(d => ({ id: d.user_id, email: d.email }))
      const r = await mandarLote(resend, campanaId, contenido, lote)
      if (!r.ok) return terminar(`Se cortó al reintentar un lote pendiente: ${r.mensaje}`)
      const { error: errorMarca } = await service.from('emails_enviados').update({ estado: 'enviado', error: null }).eq('campana_id', campanaId).in('user_id', lote.map(d => d.id))
      if (errorMarca) return terminar(`Los correos de un lote salieron, pero no se pudo apuntar: ${errorMarca.message}`)
      await latido()
      await espera(PAUSA_MS)
    }
  }

  // ── 2. Los que aún no tienen fila ──
  const yaTienenFila = new Set(registrados.map(r => r.user_id))
  const pendientes = destinatarios.filter(d => !yaTienenFila.has(d.id))

  for (let i = 0; i < pendientes.length; i += POR_LOTE) {
    const candidatos = pendientes.slice(i, i + POR_LOTE)
    const { data: reservados, error: errorReserva } = await service
      .from('emails_enviados')
      .upsert(
        candidatos.map(d => ({ user_id: d.id, email: d.email, campana, campana_id: campanaId, estado: 'enviando' })),
        { onConflict: 'user_id,campana', ignoreDuplicates: true },
      )
      .select('user_id, email')
    if (errorReserva) return terminar(`No se pudo apuntar a los destinatarios: ${errorReserva.message}`)

    // Solo se manda a quien se ha podido apuntar ahora: el resto ya lo tenía otro envío.
    const lote = ((reservados ?? []) as { user_id: string; email: string }[])
      .map(r => ({ id: r.user_id, email: r.email }))
      .sort((a, b) => a.id.localeCompare(b.id))
    if (lote.length === 0) continue

    const r = await mandarLote(resend, campanaId, contenido, lote)
    if (!r.ok) {
      if (r.seguroQueNoSalio) {
        // No salió nada: se deshace la reserva para que el reintento les escriba.
        await service.from('emails_enviados').delete().eq('campana_id', campanaId).in('user_id', lote.map(d => d.id))
      }
      return terminar(r.mensaje)
    }
    const { error: errorMarca } = await service.from('emails_enviados').update({ estado: 'enviado' }).eq('campana_id', campanaId).in('user_id', lote.map(d => d.id))
    if (errorMarca) {
      // Los correos ya han salido, pero sus filas se quedan en 'enviando'. Se para
      // aquí a propósito: así nunca hay más de un lote sin confirmar, y el reintento
      // lo reenvía entero con la misma clave, que Resend no duplica. Si se siguiera,
      // dos lotes a medias podrían rehacerse mezclados, con otra clave, y duplicar.
      console.error('[comunicaciones] marcar enviados', campanaId, errorMarca)
      return terminar(`Los correos de un lote salieron, pero no se pudo apuntar: ${errorMarca.message}`)
    }
    await latido()
    if (i + POR_LOTE < pendientes.length) await espera(PAUSA_MS)
  }

  return terminar(null)
}

