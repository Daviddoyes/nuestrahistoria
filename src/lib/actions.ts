'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import type { Plan, Profile, ConQuien, InvitacionPendiente, SolicitudPendiente, PublicPlan, PlanExplorar } from '@/types/planes'

export async function getMyData(): Promise<{
  planes: Plan[]
  profile: Profile | null
  invitaciones: InvitacionPendiente[]
}> {
  const serverSupa = await createServerClient()
  const { data: { user } } = await serverSupa.auth.getUser()
  if (!user) return { planes: [], profile: null, invitaciones: [] }

  const service = createServiceRoleClient()

  const { data: profile } = await service
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return { planes: [], profile: null, invitaciones: [] }

  // Own plans (pareja_codigo = user.id)
  const { data: ownPlanes } = await service
    .from('planes')
    .select('*')
    .eq('pareja_codigo', user.id)

  // Plans user has accepted as participant
  const { data: participaciones } = await service
    .from('plan_participantes' as never)
    .select('plan_id, estado')
    .eq('user_id', user.id)
    .in('estado', ['aceptado'])

  let sharedPlanes: Plan[] = []
  if (participaciones && (participaciones as { plan_id: string }[]).length > 0) {
    const ownIds = new Set((ownPlanes ?? []).map((p: Plan) => p.id))
    const foreignIds = (participaciones as { plan_id: string }[])
      .map(p => p.plan_id)
      .filter(id => !ownIds.has(id))
    if (foreignIds.length > 0) {
      const { data } = await service.from('planes').select('*').in('id', foreignIds)
      sharedPlanes = (data ?? []) as Plan[]
    }
  }

  // Pending invitations
  const { data: invitadoParts } = await service
    .from('plan_participantes' as never)
    .select('id, plan_id')
    .eq('user_id', user.id)
    .eq('estado', 'invitado')

  let invitaciones: InvitacionPendiente[] = []
  if (invitadoParts && (invitadoParts as { id: string; plan_id: string }[]).length > 0) {
    const planIds = (invitadoParts as { id: string; plan_id: string }[]).map(p => p.plan_id)
    const { data: planData } = await service
      .from('planes')
      .select('id, titulo, creado_por')
      .in('id', planIds)

    invitaciones = (invitadoParts as { id: string; plan_id: string }[]).map(p => {
      const plan = (planData ?? []).find((pl: { id: string; titulo: string; creado_por: string }) => pl.id === p.plan_id)
      return {
        participante_id: p.id,
        plan_id: p.plan_id,
        plan_titulo: plan?.titulo ?? 'Plan',
        invitado_por: plan?.creado_por ?? 'Alguien',
      }
    })
  }

  const planes = [...(ownPlanes ?? []), ...sharedPlanes] as Plan[]
  return { planes, profile: profile as Profile, invitaciones }
}

export async function getMyProfile(): Promise<Profile | null> {
  const serverSupa = await createServerClient()
  const { data: { user } } = await serverSupa.auth.getUser()
  if (!user) return null

  const service = createServiceRoleClient()
  const { data: profile } = await service
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    const nombre = (user.user_metadata?.nombre as string) || user.email?.split('@')[0] || ''
    const base = nombre.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || 'user'
    const suffix = Math.random().toString(36).slice(2, 6)
    const { data: newProfile } = await service
      .from('profiles')
      .insert({ id: user.id, email: user.email || '', nombre, username: `${base}_${suffix}` })
      .select()
      .single()
    return newProfile as Profile | null
  }

  return profile as Profile
}

export async function addPlan(
  titulo: string,
  descripcion: string | null,
  conQuien: ConQuien = 'todos',
  invitadoIds: string[] = []
): Promise<{ success: boolean; error?: string }> {
  try {
    const serverSupa = await createServerClient()
    const { data: { user } } = await serverSupa.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const service = createServiceRoleClient()
    const { data: profile } = await service
      .from('profiles')
      .select('nombre')
      .eq('id', user.id)
      .single()

    if (!profile) return { success: false, error: 'Perfil no encontrado' }

    const { data: newPlan, error } = await service
      .from('planes')
      .insert({
        titulo,
        descripcion,
        creado_por: profile.nombre || user.email || 'Usuario',
        pareja_codigo: user.id,
        estado: 'pendiente',
        con_quien: conQuien,
        orden: 0,
      })
      .select('id')
      .single()

    if (error || !newPlan) return { success: false, error: error?.message ?? 'Error al crear plan' }

    // Insert creator as owner participant
    await service.from('plan_participantes' as never).insert({
      plan_id: newPlan.id,
      user_id: user.id,
      nombre_usuario: profile.nombre || user.email || 'Usuario',
      estado: 'owner',
    })

    // Insert invitados
    if (invitadoIds.length > 0) {
      const { data: invProfiles } = await service
        .from('profiles')
        .select('id, nombre')
        .in('id', invitadoIds)

      if (invProfiles && (invProfiles as { id: string; nombre: string }[]).length > 0) {
        await service.from('plan_participantes' as never).insert(
          (invProfiles as { id: string; nombre: string }[]).map(p => ({
            plan_id: newPlan.id,
            user_id: p.id,
            nombre_usuario: p.nombre,
            estado: 'invitado',
          }))
        )
      }
    }

    revalidatePath('/perfil')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function updatePlanDescripcion(
  id: string,
  descripcion: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const serverSupa = await createServerClient()
    const { data: { user } } = await serverSupa.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const service = createServiceRoleClient()

    // Only the owner of the plan may edit its description
    const { data: plan } = await service
      .from('planes')
      .select('pareja_codigo')
      .eq('id', id)
      .single()

    if (!plan || (plan as { pareja_codigo: string }).pareja_codigo !== user.id) {
      return { success: false, error: 'No autorizado' }
    }

    const { error } = await service
      .from('planes')
      .update({ descripcion })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/perfil')
    revalidatePath(`/plan/${id}`)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function completarPlan(
  id: string,
  historiaDescripcion: string,
  fotoUrl: string | null,
  fechaMomento: string | null
) {
  const service = createServiceRoleClient()

  // Freeze the momentos into the plan so the story slideshow doesn't depend on
  // rows that could be deleted later. Cronological order = the order they'll play.
  const { data: momentos } = await service
    .from('plan_momentos')
    .select('foto_url')
    .eq('plan_id', id)
    .order('created_at', { ascending: true })

  const momentosUrls = ((momentos ?? []) as { foto_url: string }[]).map(m => m.foto_url)

  const { error } = await service
    .from('planes')
    .update({
      estado: 'hecho',
      historia_descripcion: historiaDescripcion,
      foto_url: fotoUrl,
      fecha_momento: fechaMomento,
      momentos_urls: momentosUrls,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/perfil')
}

export async function deletePlan(id: string) {
  const service = createServiceRoleClient()
  const { error } = await service.from('planes').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/perfil')
}

export async function updateOrden(updates: { id: string; orden: number }[]) {
  const service = createServiceRoleClient()
  await Promise.all(
    updates.map(({ id, orden }) =>
      service.from('planes').update({ orden }).eq('id', id)
    )
  )
  revalidatePath('/perfil')
}

/**
 * El feed de Explorar muestra historias de otra gente, así que estas dos
 * acciones son alcanzables sobre planes ajenos: hay que comprobar el dueño.
 */
async function assertOwner(planId: string) {
  const serverSupa = await createServerClient()
  const { data: { user } } = await serverSupa.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const service = createServiceRoleClient()
  const { data: plan } = await service
    .from('planes')
    .select('pareja_codigo')
    .eq('id', planId)
    .single()

  if (!plan || (plan as { pareja_codigo: string }).pareja_codigo !== user.id) {
    throw new Error('No autorizado')
  }
}

export async function updateHistoriaDescripcion(id: string, descripcion: string) {
  await assertOwner(id)
  const service = createServiceRoleClient()
  const { error } = await service
    .from('planes')
    .update({ historia_descripcion: descripcion })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/perfil')
}

export async function revertirHistoria(id: string) {
  await assertOwner(id)
  const service = createServiceRoleClient()
  const { error } = await service
    .from('planes')
    .update({ estado: 'pendiente', foto_url: null, historia_descripcion: null, fecha_momento: null, momentos_urls: null })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/perfil')
}

export async function completeOnboarding(data: {
  intereses: string[]
  con_quien_vive: string[]
}): Promise<void> {
  const serverSupa = await createServerClient()
  const { data: { user } } = await serverSupa.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const service = createServiceRoleClient()
  const { error } = await service
    .from('profiles')
    .update({
      onboarding_completado: true,
      intereses: data.intereses,
      con_quien_vive: data.con_quien_vive,
    })
    .eq('id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/onboarding')
  revalidatePath('/perfil')
}

export async function acceptInvitation(participanteId: string): Promise<void> {
  const service = createServiceRoleClient()
  await service
    .from('plan_participantes' as never)
    .update({ estado: 'aceptado' })
    .eq('id', participanteId)
  revalidatePath('/perfil')
}

export async function rejectInvitation(participanteId: string): Promise<void> {
  const service = createServiceRoleClient()
  await service
    .from('plan_participantes' as never)
    .delete()
    .eq('id', participanteId)
  revalidatePath('/perfil')
}

export async function inviteUserToPlan(
  planId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const service = createServiceRoleClient()
    const { data: prof } = await service
      .from('profiles')
      .select('nombre')
      .eq('id', userId)
      .single()

    await service.from('plan_participantes' as never).upsert(
      {
        plan_id: planId,
        user_id: userId,
        nombre_usuario: (prof as { nombre: string } | null)?.nombre ?? '',
        estado: 'invitado',
      },
      { onConflict: 'plan_id,user_id' }
    )
    revalidatePath('/perfil')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function leavePlan(planId: string): Promise<void> {
  const serverSupa = await createServerClient()
  const { data: { user } } = await serverSupa.auth.getUser()
  if (!user) return

  const service = createServiceRoleClient()
  await service
    .from('plan_participantes' as never)
    .delete()
    .eq('plan_id', planId)
    .eq('user_id', user.id)
  revalidatePath('/perfil')
}

// ─────────────────────────────────────────────────────────────
// Public plans
// ─────────────────────────────────────────────────────────────

export async function setPlanPublico(
  planId: string,
  publico: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const serverSupa = await createServerClient()
    const { data: { user } } = await serverSupa.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const service = createServiceRoleClient()

    // Only the owner of the plan may change its visibility
    const { data: plan } = await service
      .from('planes')
      .select('pareja_codigo')
      .eq('id', planId)
      .single()

    if (!plan || (plan as { pareja_codigo: string }).pareja_codigo !== user.id) {
      return { success: false, error: 'No autorizado' }
    }

    const { error } = await service
      .from('planes')
      .update({ publico })
      .eq('id', planId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/perfil')
    revalidatePath(`/plan/${planId}`)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function getPublicPlan(planId: string): Promise<PublicPlan | null> {
  const service = createServiceRoleClient()

  const { data: plan } = await service
    .from('planes')
    .select('id, titulo, publico, descripcion, descripcion_publica, pareja_codigo, creado_por')
    .eq('id', planId)
    .single()

  const p = plan as {
    id: string
    titulo: string
    publico: boolean | null
    descripcion: string | null
    descripcion_publica: string | null
    pareja_codigo: string
    creado_por: string
  } | null

  // Not public or non-existent → treat as unavailable
  if (!p || !p.publico) return null

  // Creator profile
  const { data: creador } = await service
    .from('profiles')
    .select('nombre, username, foto_perfil_url')
    .eq('id', p.pareja_codigo)
    .single()

  const creadorProfile = creador as
    | { nombre: string | null; username: string | null; foto_perfil_url: string | null }
    | null

  // Members who have joined (owner + accepted)
  const { data: parts } = await service
    .from('plan_participantes')
    .select('user_id, nombre_usuario, estado')
    .eq('plan_id', planId)

  const allParts = (parts ?? []) as {
    user_id: string
    nombre_usuario: string | null
    estado: string
  }[]

  const miembros = allParts.filter(pt => pt.estado === 'owner' || pt.estado === 'aceptado')

  // Attach avatars
  const fotoMap: Record<string, string | null> = {}
  const miembroIds = miembros.map(m => m.user_id)
  if (miembroIds.length > 0) {
    const { data: perfiles } = await service
      .from('profiles')
      .select('id, foto_perfil_url')
      .in('id', miembroIds)
    for (const pf of (perfiles ?? []) as { id: string; foto_perfil_url: string | null }[]) {
      fotoMap[pf.id] = pf.foto_perfil_url
    }
  }

  const participantes = miembros.map(m => ({
    nombre: m.nombre_usuario ?? 'Usuario',
    foto: fotoMap[m.user_id] ?? null,
  }))

  // Viewer context
  const serverSupa = await createServerClient()
  const { data: { user } } = await serverSupa.auth.getUser()

  let viewerEstado: PublicPlan['viewerEstado'] = 'ninguno'
  if (user) {
    const mine = allParts.find(pt => pt.user_id === user.id)
    if (mine) {
      if (mine.estado === 'owner' || mine.estado === 'aceptado') viewerEstado = 'participante'
      else if (mine.estado === 'solicitado') viewerEstado = 'solicitado'
    }
  }

  return {
    id: p.id,
    titulo: p.titulo,
    descripcion: p.descripcion,
    descripcion_publica: p.descripcion_publica,
    creador_nombre: creadorProfile?.nombre ?? p.creado_por ?? 'Alguien',
    creador_username: creadorProfile?.username ?? null,
    creador_foto: creadorProfile?.foto_perfil_url ?? null,
    participantes,
    loggedIn: !!user,
    viewerEstado,
  }
}

export async function requestJoinPlan(
  planId: string
): Promise<{ success: boolean; estado?: PublicPlan['viewerEstado']; error?: string; needsLogin?: boolean }> {
  try {
    const serverSupa = await createServerClient()
    const { data: { user } } = await serverSupa.auth.getUser()
    if (!user) return { success: false, needsLogin: true }

    const service = createServiceRoleClient()

    // Plan must exist and be public
    const { data: plan } = await service
      .from('planes')
      .select('publico')
      .eq('id', planId)
      .single()

    if (!plan || !(plan as { publico: boolean | null }).publico) {
      return { success: false, error: 'Este plan no está disponible.' }
    }

    // Already related to this plan?
    const { data: existing } = await service
      .from('plan_participantes')
      .select('id, estado')
      .eq('plan_id', planId)
      .eq('user_id', user.id)
      .maybeSingle()

    const ex = existing as { id: string; estado: string } | null
    if (ex) {
      if (ex.estado === 'owner' || ex.estado === 'aceptado') {
        return { success: true, estado: 'participante' }
      }
      // Re-activate a previous request/rejection as a fresh request
      await service
        .from('plan_participantes')
        .update({ estado: 'solicitado' })
        .eq('id', ex.id)
      return { success: true, estado: 'solicitado' }
    }

    const { data: profile } = await service
      .from('profiles')
      .select('nombre')
      .eq('id', user.id)
      .single()

    const { error } = await service.from('plan_participantes').insert({
      plan_id: planId,
      user_id: user.id,
      nombre_usuario: (profile as { nombre: string | null } | null)?.nombre ?? user.email ?? 'Usuario',
      estado: 'solicitado',
    })

    if (error) {
      // Most likely cause: a CHECK constraint on plan_participantes.estado that
      // doesn't allow 'solicitado'. Surface it instead of failing silently.
      console.error('[requestJoinPlan] insert failed:', error.message)
      return { success: false, error: error.message }
    }

    revalidatePath(`/plan/${planId}`)
    return { success: true, estado: 'solicitado' }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function getSolicitudes(): Promise<SolicitudPendiente[]> {
  const serverSupa = await createServerClient()
  const { data: { user } } = await serverSupa.auth.getUser()
  if (!user) return []

  const service = createServiceRoleClient()

  // Plans owned by the current user
  const { data: ownPlanes } = await service
    .from('planes')
    .select('id, titulo')
    .eq('pareja_codigo', user.id)

  const planes = (ownPlanes ?? []) as { id: string; titulo: string }[]
  console.log('[solicitudes] user:', user.id, 'planes propios:', planes.length)
  if (planes.length === 0) return []

  const planIds = planes.map(p => p.id)
  const tituloMap = Object.fromEntries(planes.map(p => [p.id, p.titulo]))

  const { data: solicitudes, error: solError } = await service
    .from('plan_participantes')
    .select('id, plan_id, user_id, nombre_usuario')
    .eq('estado', 'solicitado')
    .in('plan_id', planIds)

  console.log('[solicitudes]', solicitudes, solError ?? '')

  const rows = (solicitudes ?? []) as {
    id: string
    plan_id: string
    user_id: string
    nombre_usuario: string | null
  }[]
  if (rows.length === 0) return []

  // Avatars for requesters
  const userIds = [...new Set(rows.map(r => r.user_id))]
  const { data: perfiles } = await service
    .from('profiles')
    .select('id, foto_perfil_url')
    .in('id', userIds)
  const fotoMap = Object.fromEntries(
    ((perfiles ?? []) as { id: string; foto_perfil_url: string | null }[]).map(pf => [pf.id, pf.foto_perfil_url])
  )

  return rows.map(r => ({
    participante_id: r.id,
    plan_id: r.plan_id,
    plan_titulo: tituloMap[r.plan_id] ?? 'Plan',
    nombre_usuario: r.nombre_usuario ?? 'Alguien',
    foto_perfil_url: fotoMap[r.user_id] ?? null,
  }))
}

export async function resolverSolicitud(
  participanteId: string,
  aceptar: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const serverSupa = await createServerClient()
    const { data: { user } } = await serverSupa.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const service = createServiceRoleClient()

    // Verify the request belongs to a plan owned by the current user
    const { data: row } = await service
      .from('plan_participantes')
      .select('plan_id')
      .eq('id', participanteId)
      .single()

    const planId = (row as { plan_id: string } | null)?.plan_id
    if (!planId) return { success: false, error: 'Solicitud no encontrada' }

    const { data: plan } = await service
      .from('planes')
      .select('pareja_codigo')
      .eq('id', planId)
      .single()

    if (!plan || (plan as { pareja_codigo: string }).pareja_codigo !== user.id) {
      return { success: false, error: 'No autorizado' }
    }

    await service
      .from('plan_participantes')
      .update({ estado: aceptar ? 'aceptado' : 'rechazado' })
      .eq('id', participanteId)

    revalidatePath('/perfil')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ─────────────────────────────────────────────────────────────
// Momentos + notificaciones
// ─────────────────────────────────────────────────────────────

/**
 * Avisa al resto de participantes del plan (owner + aceptados) de que alguien
 * ha subido una foto. Va por el service role porque la RLS de `notificaciones`
 * solo deja escribir filas propias, y aquí se escriben las de los demás.
 */
export async function notificarNuevoMomento(planId: string): Promise<void> {
  const serverSupa = await createServerClient()
  const { data: { user } } = await serverSupa.auth.getUser()
  if (!user) return

  const service = createServiceRoleClient()

  const { data: plan } = await service
    .from('planes')
    .select('titulo')
    .eq('id', planId)
    .single()
  if (!plan) return

  const { data: profile } = await service
    .from('profiles')
    .select('nombre')
    .eq('id', user.id)
    .single()

  const nombre = (profile as { nombre: string | null } | null)?.nombre ?? 'Alguien'
  const titulo = (plan as { titulo: string }).titulo

  const { data: parts } = await service
    .from('plan_participantes')
    .select('user_id, estado')
    .eq('plan_id', planId)
    .in('estado', ['owner', 'aceptado'])

  const destinatarios = [
    ...new Set(
      ((parts ?? []) as { user_id: string }[])
        .map(p => p.user_id)
        .filter(id => id !== user.id)
    ),
  ]

  if (destinatarios.length === 0) return

  await service.from('notificaciones').insert(
    destinatarios.map(userId => ({
      user_id: userId,
      tipo: 'nuevo_momento',
      mensaje: `${nombre} añadió una foto a ${titulo}`,
      plan_id: planId,
    }))
  )
}

// ─────────────────────────────────────────────────────────────
// Explorar
// ─────────────────────────────────────────────────────────────

/** Historias públicas de todo el mundo, para el feed de Explorar. */
export async function getPlanesPublicos(): Promise<PlanExplorar[]> {
  const serverSupa = await createServerClient()
  const { data: { user } } = await serverSupa.auth.getUser()

  const service = createServiceRoleClient()

  const { data: planes } = await service
    .from('planes')
    .select('*')
    .eq('publico', true)
    .eq('estado', 'hecho')
    .order('created_at', { ascending: false })
    .limit(20)

  const rows = (planes ?? []) as Plan[]
  if (rows.length === 0) return []

  // El autor es el dueño del plan: `pareja_codigo` es su id, más fiable que
  // cruzar por `creado_por`, que es solo el nombre mostrado.
  const autorIds = [...new Set(rows.map(p => p.pareja_codigo))]
  const { data: perfiles } = await service
    .from('profiles')
    .select('id, nombre, username, foto_perfil_url')
    .in('id', autorIds)

  const autorMap = Object.fromEntries(
    ((perfiles ?? []) as { id: string; nombre: string | null; username: string | null; foto_perfil_url: string | null }[])
      .map(pf => [pf.id, pf])
  )

  return rows.map(p => {
    const autor = autorMap[p.pareja_codigo]
    return {
      ...p,
      autor_nombre: autor?.nombre ?? p.creado_por ?? 'Alguien',
      autor_username: autor?.username ?? null,
      autor_foto: autor?.foto_perfil_url ?? null,
      es_mio: !!user && p.pareja_codigo === user.id,
    }
  })
}

/** Copia un plan público a la lista del usuario actual, como pendiente. */
export async function copiarPlan(planId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const serverSupa = await createServerClient()
    const { data: { user } } = await serverSupa.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const service = createServiceRoleClient()

    const { data: original } = await service
      .from('planes')
      .select('titulo, descripcion, categoria, publico')
      .eq('id', planId)
      .single()

    const orig = original as
      | { titulo: string; descripcion: string | null; categoria: string | null; publico: boolean | null }
      | null

    if (!orig || !orig.publico) return { success: false, error: 'Este plan no está disponible.' }

    const { data: profile } = await service
      .from('profiles')
      .select('nombre')
      .eq('id', user.id)
      .single()

    const nombre = (profile as { nombre: string | null } | null)?.nombre ?? user.email ?? 'Usuario'

    const { data: nuevoPlan, error } = await service
      .from('planes')
      .insert({
        titulo: orig.titulo,
        descripcion: orig.descripcion,
        categoria: orig.categoria,
        creado_por: nombre,
        pareja_codigo: user.id,
        estado: 'pendiente',
        publico: false,
        con_quien: 'solo',
        orden: 0,
      })
      .select('id')
      .single()

    if (error || !nuevoPlan) return { success: false, error: error?.message ?? 'Error al copiar el plan' }

    // Sin la fila de owner el plan copiado aparecería sin participantes.
    await service.from('plan_participantes').insert({
      plan_id: (nuevoPlan as { id: string }).id,
      user_id: user.id,
      nombre_usuario: nombre,
      estado: 'owner',
    })

    revalidatePath('/perfil')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function searchUsers(
  query: string
): Promise<{ id: string; nombre: string; username: string; foto_perfil_url: string | null }[]> {
  if (query.trim().length < 2) return []
  const service = createServiceRoleClient()
  const { data } = await service
    .from('profiles')
    .select('id, nombre, username, foto_perfil_url')
    .ilike('username', `%${query.trim()}%`)
    .limit(5)
  return (data ?? []) as { id: string; nombre: string; username: string; foto_perfil_url: string | null }[]
}
