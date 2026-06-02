'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import type { Plan, Profile, ConQuien, InvitacionPendiente } from '@/types/planes'

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
      .select('plan, nombre')
      .eq('id', user.id)
      .single()

    if (!profile) return { success: false, error: 'Perfil no encontrado' }

    if (profile.plan === 'free') {
      const { count } = await service
        .from('planes')
        .select('*', { count: 'exact', head: true })
        .eq('pareja_codigo', user.id)
        .eq('estado', 'pendiente')
      if ((count ?? 0) >= 5)
        return { success: false, error: 'Límite del plan gratuito alcanzado' }
    }

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

export async function completarPlan(
  id: string,
  historiaDescripcion: string,
  fotoUrl: string | null,
  fechaMomento: string | null
) {
  const service = createServiceRoleClient()
  const { error } = await service
    .from('planes')
    .update({
      estado: 'hecho',
      historia_descripcion: historiaDescripcion,
      foto_url: fotoUrl,
      fecha_momento: fechaMomento,
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

export async function updateHistoriaDescripcion(id: string, descripcion: string) {
  const service = createServiceRoleClient()
  const { error } = await service
    .from('planes')
    .update({ historia_descripcion: descripcion })
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
