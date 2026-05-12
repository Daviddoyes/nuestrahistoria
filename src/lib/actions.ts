'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import type { Plan, Profile } from '@/types/planes'

const getAnonClient = () =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

export async function getMyData(): Promise<{ planes: Plan[]; profile: Profile | null }> {
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

  // Build list of pareja_codigos to query — handle null codigo_invitacion safely
  const codigos: string[] = []
  if (profile.codigo_invitacion) codigos.push(profile.codigo_invitacion)

  if (profile.pareja_id) {
    const { data: partner } = await service
      .from('profiles')
      .select('codigo_invitacion')
      .eq('id', profile.pareja_id)
      .single()
    if (partner?.codigo_invitacion) codigos.push(partner.codigo_invitacion)
  }

  if (codigos.length === 0) return { planes: [], profile: profile as Profile }

  const supabase = getAnonClient()
  const { data: planes, error } = await supabase
    .from('planes')
    .select('*')
    .in('pareja_codigo', codigos)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return { planes: (planes ?? []) as Plan[], profile: profile as Profile }
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
      })
      .select()
      .single()
    return newProfile as Profile | null
  }

  return profile as Profile
}

export async function addPlan(titulo: string, descripcion: string | null) {
  const serverSupa = await createServerClient()
  const {
    data: { user },
  } = await serverSupa.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const service = createServiceRoleClient()
  const { data: profile } = await service
    .from('profiles')
    .select('codigo_invitacion, plan, nombre, pareja_id')
    .eq('id', user.id)
    .single()

  if (!profile?.codigo_invitacion) throw new Error('Perfil no encontrado')

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
    // Only count pending plans — completed plans don't count toward the limit
    const { count } = await supabase
      .from('planes')
      .select('*', { count: 'exact', head: true })
      .in('pareja_codigo', codigos)
      .eq('estado', 'pendiente')
    if ((count ?? 0) >= 5) throw new Error('Límite del plan gratuito alcanzado')
  }

  const supabase = getAnonClient()
  const { error } = await supabase.from('planes').insert({
    titulo,
    descripcion,
    creado_por: profile.nombre || user.email || 'Usuario',
    pareja_codigo: profile.codigo_invitacion,
    estado: 'pendiente',
  })

  if (error) throw new Error(error.message)
  revalidatePath('/planes')
}

export async function completarPlan(
  id: string,
  historiaDescripcion: string,
  fotoUrl: string | null
) {
  const supabase = getAnonClient()
  const { error } = await supabase
    .from('planes')
    .update({
      estado: 'hecho',
      historia_descripcion: historiaDescripcion,
      foto_url: fotoUrl,
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

export async function vincularPareja(codigoPartner: string): Promise<void> {
  const serverSupa = await createServerClient()
  const {
    data: { user },
  } = await serverSupa.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const service = createServiceRoleClient()

  const { data: partner, error: partnerError } = await service
    .from('profiles')
    .select('id')
    .eq('codigo_invitacion', codigoPartner.trim().toLowerCase())
    .single()

  if (partnerError || !partner) throw new Error('Código no encontrado')
  if (partner.id === user.id) throw new Error('No puedes vincularte contigo mismo')

  await service.from('profiles').update({ pareja_id: partner.id }).eq('id', user.id)
  await service.from('profiles').update({ pareja_id: user.id }).eq('id', partner.id)

  revalidatePath('/onboarding')
  revalidatePath('/planes')
}
