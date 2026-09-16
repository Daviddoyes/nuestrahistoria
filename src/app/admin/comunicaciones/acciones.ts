'use server'

import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { esAdmin } from '@/lib/admin-auth'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { enlaceBaja } from '@/lib/email-baja'
import { leerTodo, type Servicio } from '@/lib/admin-datos'
import { REMITENTE_CAMPANAS } from '@/lib/email-remitente'
import {
  ENVIO_PARADO_MS, calcularGrupos, contenidoDeFila, recuentoGrupos, reenviarSinConfirmar, repartirCampana, sinConfirmarDe,
  type RecuentoGrupo, type ResultadoEnvio,
} from '@/lib/comunicaciones'
import {
  esGrupo, htmlCorreo, mismoContenido, nombreGrupo, normalizarContenido, textoCorreo, validarContenido,
  type ContenidoCorreo, type GrupoCorreo,
} from '@/lib/email-plantilla'

type Fallo = { ok: false; error: string }

const PALABRA_CONFIRMACION = 'ENVIAR'
const SIN_PERMISO: Fallo = { ok: false, error: 'Esta cuenta no tiene acceso al panel.' }
const SIN_RESEND: Fallo = { ok: false, error: 'Falta RESEND_API_KEY en el servidor: no se puede enviar nada.' }
const esId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)

type FilaCampana = {
  id: string; asunto: string; cuerpo: string; boton_texto: string | null; boton_url: string | null
  grupo: GrupoCorreo; estado: string; enviado_en: string | null; creado_en: string
}
const COLUMNAS = 'id, asunto, cuerpo, boton_texto, boton_url, grupo, estado, enviado_en, creado_en'

async function leerCampana(service: Servicio, id: string): Promise<FilaCampana | null> {
  const { data } = await service.from('emails_campanas').select(COLUMNAS).eq('id', id).maybeSingle()
  return (data as FilaCampana | null) ?? null
}

// ── Recuento de los grupos ───────────────────────────────────────

/** Cuántas personas hay en cada grupo AHORA. Lo pide el diálogo justo antes de confirmar. */
export async function recuentoDeGrupos(): Promise<{ ok: true; grupos: RecuentoGrupo[] } | Fallo> {
  if (!await esAdmin()) return SIN_PERMISO
  try {
    return { ok: true, grupos: await recuentoGrupos(createServiceRoleClient()) }
  } catch (e) {
    console.error('[comunicaciones] recuento', e)
    return { ok: false, error: 'No se pudieron contar los destinatarios. Inténtalo de nuevo.' }
  }
}

// ── Prueba ────────────────────────────────────────────────────────

/**
 * Manda el correo SOLO a la cuenta de quien pulsa, y guarda ese texto como
 * borrador. El borrador solo cambia aquí, después de que la prueba haya salido:
 * por eso lo que hay guardado en un borrador es siempre un texto ya probado, y
 * el envío real se niega a mandar cualquier otro.
 */
export async function enviarPrueba(entrada: { contenido: ContenidoCorreo; campanaId: string | null }): Promise<
  { ok: true; campanaId: string; probado: ContenidoCorreo; a: string } | Fallo
> {
  if (!await esAdmin()) return SIN_PERMISO
  if (!process.env.RESEND_API_KEY) return SIN_RESEND

  const contenido = normalizarContenido(entrada.contenido)
  const errores = validarContenido(contenido)
  if (errores.length > 0) return { ok: false, error: errores.join(' ') }

  const supa = await createServerClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user?.email) return { ok: false, error: 'Tu cuenta no tiene email al que mandar la prueba.' }

  // El enlace de baja de la prueba es el de verdad, firmado con tu id: pulsarlo te da de baja a ti.
  const baja = enlaceBaja(user.id)
  const { error: errorEnvio } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: REMITENTE_CAMPANAS,
    to: user.email,
    subject: `[PRUEBA] ${contenido.asunto}`,
    html: htmlCorreo(contenido, { enlaceBaja: baja, esPrueba: true }),
    text: textoCorreo(contenido, baja),
  })
  if (errorEnvio) {
    console.error('[comunicaciones] prueba', errorEnvio)
    return { ok: false, error: `No se pudo mandar la prueba: ${errorEnvio.message}` }
  }

  const service = createServiceRoleClient()
  const fila = {
    asunto: contenido.asunto,
    cuerpo: contenido.cuerpo,
    boton_texto: contenido.botonTexto || null,
    boton_url: contenido.botonUrl || null,
  }

  // Se reutiliza el borrador si sigue siéndolo. Si ya se envió, este texto es
  // una campaña nueva: nunca se reescribe el texto de algo ya enviado.
  if (esId(entrada.campanaId)) {
    const { data } = await service.from('emails_campanas').update(fila)
      .eq('id', entrada.campanaId).eq('estado', 'borrador').select('id')
    if (data && data.length > 0) return { ok: true, campanaId: entrada.campanaId, probado: contenido, a: user.email }
  }

  const { data: nueva, error } = await service.from('emails_campanas')
    .insert({ ...fila, estado: 'borrador', grupo: 'todos', creado_por: user.id })
    .select('id').single()
  if (error || !nueva) {
    console.error('[comunicaciones] guardar borrador', error)
    return { ok: false, error: 'La prueba ha salido, pero no se pudo guardar el borrador. Vuelve a mandarte la prueba.' }
  }
  return { ok: true, campanaId: (nueva as { id: string }).id, probado: contenido, a: user.email }
}

// ── Envío real ────────────────────────────────────────────────────

export type ResultadoAccionEnvio = ({ ok: true } & ResultadoEnvio) | Fallo

/**
 * Envía una campaña a un grupo. Todas las comprobaciones se repiten aquí aunque
 * la pantalla ya las haga: el botón se puede activar a mano en el navegador.
 */
export async function enviarCampana(entrada: {
  campanaId: string; contenido: ContenidoCorreo; grupo: GrupoCorreo; esperados: number; confirmacion: string
}): Promise<ResultadoAccionEnvio> {
  if (!await esAdmin()) return SIN_PERMISO
  if (!process.env.RESEND_API_KEY) return SIN_RESEND
  if (entrada.confirmacion !== PALABRA_CONFIRMACION) return { ok: false, error: `Escribe ${PALABRA_CONFIRMACION} para confirmar.` }
  if (!esId(entrada.campanaId) || !esGrupo(entrada.grupo)) return { ok: false, error: 'Petición no válida.' }

  const service = createServiceRoleClient()
  const campana = await leerCampana(service, entrada.campanaId)
  if (!campana) return { ok: false, error: 'No encuentro esa campaña. Mándate una prueba de nuevo.' }
  if (campana.estado !== 'borrador') return { ok: false, error: 'Esta campaña ya se envió o se está enviando. Mira el historial.' }

  // El texto de la pantalla tiene que ser EXACTAMENTE el que se probó.
  const contenido = contenidoDeFila(campana)
  if (!mismoContenido(contenido, entrada.contenido)) {
    return { ok: false, error: 'El texto ha cambiado desde la última prueba. Mándate otra prueba antes de enviar.' }
  }

  // El mismo texto no se manda dos veces, ni aunque venga de otro borrador.
  const { data: iguales } = await service.from('emails_campanas').select('id, creado_en')
    .neq('estado', 'borrador').neq('id', campana.id)
    .eq('asunto', contenido.asunto).eq('cuerpo', contenido.cuerpo)
    .range(0, 0)
  if (iguales && iguales.length > 0) {
    return { ok: false, error: 'Ya hay una campaña enviada con este mismo asunto y texto. Si se cortó, reanúdala desde el historial.' }
  }

  let destinatarios
  try {
    destinatarios = (await calcularGrupos(service))[entrada.grupo].destinatarios
  } catch (e) {
    console.error('[comunicaciones] grupos', e)
    return { ok: false, error: 'No se pudieron calcular los destinatarios. No se ha enviado nada.' }
  }
  if (destinatarios.length === 0) return { ok: false, error: 'Ese grupo no tiene a nadie a quien escribir. No se ha enviado nada.' }
  // Lo confirmado tiene que ser lo que se envía: si entre abrir el diálogo y
  // escribir ENVIAR cambia la cifra, se para y se vuelve a preguntar.
  if (destinatarios.length !== entrada.esperados) {
    return { ok: false, error: `El grupo ${nombreGrupo(entrada.grupo)} ha cambiado: confirmaste ${entrada.esperados} y ahora son ${destinatarios.length}. No se ha enviado nada; vuelve a confirmar.` }
  }

  // 'enviando' ANTES de mandar nada, y solo si seguía en borrador: si dos
  // pestañas llegan a la vez, solo una consigue el cambio y la otra se para aquí.
  const { data: tomada } = await service.from('emails_campanas')
    .update({ estado: 'enviando', grupo: entrada.grupo, destinatarios: destinatarios.length, enviado_en: new Date().toISOString() })
    .eq('id', campana.id).eq('estado', 'borrador')
    .select('id')
  if (!tomada || tomada.length === 0) return { ok: false, error: 'Esta campaña ya se está enviando desde otro sitio. Mira el historial.' }

  try {
    const r = await repartirCampana(service, campana.id, contenido, destinatarios)
    return { ok: true, ...r }
  } catch (e) {
    // Algo inesperado a mitad: la campaña queda como fallida con lo que conste.
    console.error('[comunicaciones] envío', e)
    await service.from('emails_campanas').update({ estado: 'fallido' }).eq('id', campana.id)
    return { ok: false, error: `El envío se cortó por un error inesperado: ${e instanceof Error ? e.message : 'desconocido'}. Mira el historial: podrás reanudarlo sin repetir a nadie.` }
  } finally {
    revalidatePath('/admin/comunicaciones')
  }
}

// ── Reanudar un envío cortado ─────────────────────────────────────

const puedeReanudarse = (c: FilaCampana) =>
  c.estado === 'fallido' ||
  (c.estado === 'enviando' && Boolean(c.enviado_en) && Date.now() - new Date(c.enviado_en as string).getTime() > ENVIO_PARADO_MS)

/** A quién le falta el correo de una campaña cortada. Solo cuenta, no escribe. */
async function faltanPor(service: Servicio, campana: FilaCampana) {
  const [grupos, filas] = await Promise.all([
    calcularGrupos(service),
    leerTodo<{ user_id: string; estado: string }>(
      (desde, hasta) => service.from('emails_enviados').select('id, user_id, estado').eq('campana_id', campana.id).order('id').range(desde, hasta),
    ),
  ])
  const conFila = new Set(filas.map(f => f.user_id))
  const destinatarios = grupos[campana.grupo].destinatarios
  return {
    destinatarios,
    nuevos: destinatarios.filter(d => !conFila.has(d.id)).length,
    sinConfirmar: filas.filter(f => f.estado === 'enviando').length,
  }
}

export async function resumenReanudar(campanaId: string): Promise<{ ok: true; grupo: GrupoCorreo; nuevos: number; sinConfirmar: number } | Fallo> {
  if (!await esAdmin()) return SIN_PERMISO
  if (!esId(campanaId)) return { ok: false, error: 'Petición no válida.' }
  const service = createServiceRoleClient()
  const campana = await leerCampana(service, campanaId)
  if (!campana || !puedeReanudarse(campana)) return { ok: false, error: 'Esta campaña no está cortada: no hay nada que reanudar.' }
  try {
    const f = await faltanPor(service, campana)
    return { ok: true, grupo: campana.grupo, nuevos: f.nuevos, sinConfirmar: f.sinConfirmar }
  } catch (e) {
    console.error('[comunicaciones] resumen reanudar', e)
    return { ok: false, error: 'No se pudo calcular a quién le falta. Inténtalo de nuevo.' }
  }
}

/**
 * Sigue un envío cortado. Salta a todo el que ya tiene fila en emails_enviados
 * (lo recibió, o estaba en el lote que se cortó, que se reenvía con su clave de
 * idempotencia para que Resend no lo duplique).
 */
export async function reanudarCampana(entrada: { campanaId: string; esperados: number; confirmacion: string }): Promise<ResultadoAccionEnvio> {
  if (!await esAdmin()) return SIN_PERMISO
  if (!process.env.RESEND_API_KEY) return SIN_RESEND
  if (entrada.confirmacion !== PALABRA_CONFIRMACION) return { ok: false, error: `Escribe ${PALABRA_CONFIRMACION} para confirmar.` }
  if (!esId(entrada.campanaId)) return { ok: false, error: 'Petición no válida.' }

  const service = createServiceRoleClient()
  const campana = await leerCampana(service, entrada.campanaId)
  if (!campana || !puedeReanudarse(campana)) return { ok: false, error: 'Esta campaña no está cortada: no hay nada que reanudar.' }

  let faltan
  try {
    faltan = await faltanPor(service, campana)
  } catch (e) {
    console.error('[comunicaciones] reanudar', e)
    return { ok: false, error: 'No se pudo calcular a quién le falta. No se ha enviado nada.' }
  }
  if (faltan.nuevos !== entrada.esperados) {
    return { ok: false, error: `Ha cambiado a quién le falta: confirmaste ${entrada.esperados} y ahora son ${faltan.nuevos}. No se ha enviado nada; vuelve a confirmar.` }
  }

  // Mismo cerrojo que al enviar: solo una pestaña consigue pasarla a 'enviando'.
  let cambio = service.from('emails_campanas').update({ estado: 'enviando', enviado_en: new Date().toISOString() }).eq('id', campana.id)
  cambio = campana.estado === 'fallido'
    ? cambio.eq('estado', 'fallido')
    : cambio.eq('estado', 'enviando').lt('enviado_en', new Date(Date.now() - ENVIO_PARADO_MS).toISOString())
  const { data: tomada } = await cambio.select('id')
  if (!tomada || tomada.length === 0) return { ok: false, error: 'Esta campaña ya se está reanudando desde otro sitio. Mira el historial.' }

  try {
    const r = await repartirCampana(service, campana.id, contenidoDeFila(campana), faltan.destinatarios)
    return { ok: true, ...r }
  } catch (e) {
    console.error('[comunicaciones] reanudar envío', e)
    await service.from('emails_campanas').update({ estado: 'fallido' }).eq('id', campana.id)
    return { ok: false, error: `El envío se volvió a cortar: ${e instanceof Error ? e.message : 'error desconocido'}. Podrás reanudarlo otra vez sin repetir a nadie.` }
  } finally {
    revalidatePath('/admin/comunicaciones')
  }
}

// ── Reenviar a los que quedaron sin confirmar ─────────────────────

/** Se puede reenviar cuando la campaña ya no está en marcha: terminada o cortada. */
const puedeReenviarse = (c: FilaCampana) => c.estado === 'enviado' || c.estado === 'fallido'

export async function resumenSinConfirmar(campanaId: string): Promise<
  { ok: true; asunto: string; grupo: GrupoCorreo; total: number; posiblesEnviados: number; fallados: number } | Fallo
> {
  if (!await esAdmin()) return SIN_PERMISO
  if (!esId(campanaId)) return { ok: false, error: 'Petición no válida.' }

  const service = createServiceRoleClient()
  const campana = await leerCampana(service, campanaId)
  if (!campana) return { ok: false, error: 'No encuentro esa campaña.' }
  if (!puedeReenviarse(campana)) return { ok: false, error: 'Esta campaña está en marcha ahora mismo. Espera a que termine.' }

  try {
    const filas = await sinConfirmarDe(service, campanaId)
    return {
      ok: true,
      asunto: campana.asunto,
      grupo: campana.grupo,
      total: filas.length,
      // 'enviando': el lote salió hacia Resend y no se supo el resultado, así que
      // puede que ya lo tengan. 'error': se dio por no enviado.
      posiblesEnviados: filas.filter(f => f.estado === 'enviando').length,
      fallados: filas.filter(f => f.estado === 'error').length,
    }
  } catch (e) {
    console.error('[comunicaciones] resumen sin confirmar', e)
    return { ok: false, error: 'No se pudo calcular quién quedó sin confirmar. Inténtalo de nuevo.' }
  }
}

/**
 * Reenvía solo a los que quedaron sin confirmar. Lo decide una persona: a quien
 * ya le llegó le llegará dos veces, y eso el programa no lo puede saber.
 */
export async function reenviarNoConfirmados(entrada: { campanaId: string; esperados: number; confirmacion: string }): Promise<ResultadoAccionEnvio> {
  if (!await esAdmin()) return SIN_PERMISO
  if (!process.env.RESEND_API_KEY) return SIN_RESEND
  if (entrada.confirmacion !== PALABRA_CONFIRMACION) return { ok: false, error: `Escribe ${PALABRA_CONFIRMACION} para confirmar.` }
  if (!esId(entrada.campanaId)) return { ok: false, error: 'Petición no válida.' }

  const service = createServiceRoleClient()
  const campana = await leerCampana(service, entrada.campanaId)
  if (!campana) return { ok: false, error: 'No encuentro esa campaña.' }
  if (!puedeReenviarse(campana)) return { ok: false, error: 'Esta campaña está en marcha ahora mismo. Espera a que termine.' }

  let pendientes
  try {
    pendientes = await sinConfirmarDe(service, entrada.campanaId)
  } catch (e) {
    console.error('[comunicaciones] reenviar', e)
    return { ok: false, error: 'No se pudo calcular quién quedó sin confirmar. No se ha enviado nada.' }
  }
  if (pendientes.length === 0) return { ok: false, error: 'Ya no queda nadie sin confirmar en esta campaña.' }
  // La cifra confirmada tiene que ser la de ahora, como en el envío normal.
  if (pendientes.length !== entrada.esperados) {
    return { ok: false, error: `Ha cambiado la cifra: confirmaste ${entrada.esperados} y ahora son ${pendientes.length}. No se ha enviado nada; vuelve a confirmar.` }
  }

  // Mismo cerrojo que al enviar: solo una pestaña consigue ponerla en marcha.
  const { data: tomada } = await service.from('emails_campanas')
    .update({ estado: 'enviando', enviado_en: new Date().toISOString() })
    .eq('id', campana.id).eq('estado', campana.estado)
    .select('id, destinatarios')
  if (!tomada || tomada.length === 0) return { ok: false, error: 'Esta campaña ya se está enviando desde otro sitio. Recarga la página.' }

  try {
    const r = await reenviarSinConfirmar(service, campana.id, contenidoDeFila(campana), (tomada[0] as { destinatarios: number }).destinatarios)
    return { ok: true, ...r }
  } catch (e) {
    console.error('[comunicaciones] reenviar envío', e)
    await service.from('emails_campanas').update({ estado: 'fallido' }).eq('id', campana.id)
    return { ok: false, error: `El reenvío se cortó: ${e instanceof Error ? e.message : 'error desconocido'}. Mira el historial.` }
  } finally {
    revalidatePath('/admin/comunicaciones')
  }
}
