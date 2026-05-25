'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import type { Plan, Profile, TipoAcceso, ConQuien } from '@/types/planes'

const getAnonClient = () =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

export async function getMyData(
  tipoAcceso: TipoAcceso = 'owner'
): Promise<{ planes: Plan[]; profile: Profile | null }> {
  const serverSupa = await createServerClient()
  const {
    data: { user },
  } = await serverSupa.auth.getUser()
  if (!user) return { planes: [], profile: null }

  const service = createServiceRoleClient()

  const { data: profile } = await service
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return { planes: [], profile: null }

  const codigos: string[] = []
  if (profile.codigo_invitacion) codigos.push(profile.codigo_invitacion)

  if (profile.pareja_id) {
    const { data: partner } = await service
      .from('profiles')
      .select('codigo_invitacion')
      .eq('id', profile.pareja_id)
      .single()
    if (partner?.codigo_invitacion) {
      codigos.push(partner.codigo_invitacion)
    }
  }
  const ownCode = profile.codigo_invitacion

  if (codigos.length === 0) return { planes: [], profile: profile as Profile }

  const supabase = getAnonClient()
  const { data: allPlanes, error } = await supabase
    .from('planes')
    .select('*')
    .in('pareja_codigo', codigos)

  if (error) throw new Error(error.message)

  const planes = (allPlanes ?? []).filter(plan => {
    // Own plans always visible
    if (plan.pareja_codigo === ownCode) return true
    // Partner's plans filtered by con_quien based on access type
    const cq: ConQuien = plan.con_quien ?? 'todos'
    if (tipoAcceso === 'amigos') return cq === 'amigos' || cq === 'todos'
    return cq === 'pareja' || cq === 'todos'
  })

  return { planes: planes as Plan[], profile: profile as Profile }
}

function randomCode() {
  return Math.random().toString(36).substring(2, 10)
}

export async function getMyProfile(): Promise<Profile | null> {
  const serverSupa = await createServerClient()
  const {
    data: { user },
  } = await serverSupa.auth.getUser()
  if (!user) return null

  const service = createServiceRoleClient()
  const { data: profile } = await service
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    const { data: newProfile } = await service
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email || '',
        nombre: (user.user_metadata?.nombre as string) || user.email?.split('@')[0] || '',
        codigo_pareja: randomCode(),
        codigo_amigos: randomCode(),
      })
      .select()
      .single()
    return newProfile as Profile | null
  }

  // Auto-generate any missing codes for existing profiles
  const missing: Record<string, string> = {}
  if (!profile.codigo_pareja) missing.codigo_pareja = randomCode()
  if (!profile.codigo_amigos) missing.codigo_amigos = randomCode()

  if (Object.keys(missing).length > 0) {
    await service.from('profiles').update(missing).eq('id', profile.id)
    Object.assign(profile, missing)
  }

  return profile as Profile
}

export async function addPlan(
  titulo: string,
  descripcion: string | null,
  conQuien: ConQuien = 'todos'
): Promise<{ success: boolean; error?: string }> {
  try {
    const serverSupa = await createServerClient()
    const {
      data: { user },
    } = await serverSupa.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const service = createServiceRoleClient()
    const { data: profile } = await service
      .from('profiles')
      .select('codigo_invitacion, plan, nombre, pareja_id')
      .eq('id', user.id)
      .single()

    if (!profile?.codigo_invitacion) return { success: false, error: 'Perfil no encontrado' }

    if (profile.plan === 'free') {
      const codigos = [profile.codigo_invitacion]
      if (profile.pareja_id) {
        const { data: partner } = await service
          .from('profiles')
          .select('codigo_invitacion')
          .eq('id', profile.pareja_id)
          .single()
        if (partner?.codigo_invitacion) codigos.push(partner.codigo_invitacion)
      }
      const supabase = getAnonClient()
      const { count } = await supabase
        .from('planes')
        .select('*', { count: 'exact', head: true })
        .in('pareja_codigo', codigos)
        .eq('estado', 'pendiente')
      if ((count ?? 0) >= 5)
        return { success: false, error: 'Límite del plan gratuito alcanzado' }
    }

    const supabase = getAnonClient()
    const { error } = await supabase.from('planes').insert({
      titulo,
      descripcion,
      creado_por: profile.nombre || user.email || 'Usuario',
      pareja_codigo: profile.codigo_invitacion,
      estado: 'pendiente',
      con_quien: conQuien,
      orden: 0,
    })

    if (error) return { success: false, error: error.message }

    revalidatePath('/planes')
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
  const supabase = getAnonClient()
  const { error } = await supabase
    .from('planes')
    .update({
      estado: 'hecho',
      historia_descripcion: historiaDescripcion,
      foto_url: fotoUrl,
      fecha_momento: fechaMomento,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/planes')
}

export async function deletePlan(id: string) {
  const supabase = getAnonClient()
  const { error } = await supabase.from('planes').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/planes')
}

export async function updateOrden(updates: { id: string; orden: number }[]) {
  const supabase = getAnonClient()
  await Promise.all(
    updates.map(({ id, orden }) =>
      supabase.from('planes').update({ orden }).eq('id', id)
    )
  )
  revalidatePath('/planes')
}

export async function vincularPareja(codigoInput: string): Promise<TipoAcceso> {
  const serverSupa = await createServerClient()
  const {
    data: { user },
  } = await serverSupa.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const service = createServiceRoleClient()
  const lower = codigoInput.trim().toLowerCase()

  let partner: { id: string } | null = null
  let tipo: TipoAcceso = 'pareja'

  // 1. Check codigo_pareja
  const { data: byPareja } = await service
    .from('profiles')
    .select('id')
    .eq('codigo_pareja', lower)
    .single()
  if (byPareja) { partner = byPareja; tipo = 'pareja' }

  // 2. Fallback: check legacy codigo_invitacion
  if (!partner) {
    const { data: byInvitacion } = await service
      .from('profiles')
      .select('id')
      .eq('codigo_invitacion', lower)
      .single()
    if (byInvitacion) { partner = byInvitacion; tipo = 'pareja' }
  }

  // 3. Check codigo_amigos
  if (!partner) {
    const { data: byAmigos } = await service
      .from('profiles')
      .select('id')
      .eq('codigo_amigos', lower)
      .single()
    if (byAmigos) { partner = byAmigos; tipo = 'amigos' }
  }

  if (!partner) throw new Error('Código no encontrado')
  if (partner.id === user.id) throw new Error('No puedes vincularte contigo mismo')

  await service.from('profiles').update({ pareja_id: partner.id }).eq('id', user.id)
  await service.from('profiles').update({ pareja_id: user.id }).eq('id', partner.id)

  revalidatePath('/onboarding')
  revalidatePath('/planes')

  return tipo
}

export async function updateHistoriaDescripcion(id: string, descripcion: string) {
  const supabase = getAnonClient()
  const { error } = await supabase
    .from('planes')
    .update({ historia_descripcion: descripcion })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/planes')
}

export async function lookupCode(
  codigo: string
): Promise<{ tipo: 'pareja' | 'amigos' } | null> {
  const service = createServiceRoleClient()
  const lower = codigo.trim().toLowerCase()

  const { data: byPareja } = await service
    .from('profiles')
    .select('id')
    .eq('codigo_pareja', lower)
    .single()
  if (byPareja) return { tipo: 'pareja' }

  const { data: byInvitacion } = await service
    .from('profiles')
    .select('id')
    .eq('codigo_invitacion', lower)
    .single()
  if (byInvitacion) return { tipo: 'pareja' }

  const { data: byAmigos } = await service
    .from('profiles')
    .select('id')
    .eq('codigo_amigos', lower)
    .single()
  if (byAmigos) return { tipo: 'amigos' }

  return null
}
