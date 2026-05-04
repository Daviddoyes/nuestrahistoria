'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

export async function verificarPassword(password: string): Promise<boolean> {
  return password === process.env.APP_PASSWORD
}

export async function getPlanes() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('planes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[getPlanes] error:', JSON.stringify(error))
    throw new Error(error.message)
  }
  return data ?? []
}

export async function addPlan(
  titulo: string,
  descripcion: string | null,
  creadoPor: string
) {
  const supabase = getSupabase()
  console.log('[addPlan] inserting:', { titulo, creadoPor })
  const { data, error } = await supabase
    .from('planes')
    .insert({ titulo, descripcion, creado_por: creadoPor, estado: 'pendiente' })
    .select()
  if (error) {
    console.error('[addPlan] error:', JSON.stringify(error))
    throw new Error(error.message)
  }
  console.log('[addPlan] inserted:', data)
  revalidatePath('/planes')
}

export async function completarPlan(
  id: string,
  historiaDescripcion: string,
  fotoUrl: string | null
) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('planes')
    .update({ estado: 'hecho', historia_descripcion: historiaDescripcion, foto_url: fotoUrl })
    .eq('id', id)
  if (error) {
    console.error('[completarPlan] error:', JSON.stringify(error))
    throw new Error(error.message)
  }
  revalidatePath('/planes')
}

export async function deletePlan(id: string) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('planes')
    .delete()
    .eq('id', id)
  if (error) {
    console.error('[deletePlan] error:', JSON.stringify(error))
    throw new Error(error.message)
  }
  revalidatePath('/planes')
}
