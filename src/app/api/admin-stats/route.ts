import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

type ProfileRow = {
  id: string
  nombre: string
  username: string | null
  email: string
  created_at: string
  onboarding_completado: boolean | null
  intereses: string[] | null
  con_quien_vive: string[] | null
  edad: number | null
}

type PlaneRow = {
  id: string
  titulo: string
  estado: string
  pareja_codigo: string
  created_at: string
}

type PartRow = {
  id: string
  plan_id: string
  user_id: string
  estado: string
}

export async function GET(request: Request) {
  if (request.headers.get('x-admin-key') !== 'LivestoryAdmin2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceRoleClient()

  const [profilesRes, planesRes, partsRes, usersRes] = await Promise.all([
    service.from('profiles').select('*'),
    service.from('planes').select('id, titulo, estado, pareja_codigo, created_at'),
    service.from('plan_participantes' as never).select('id, plan_id, user_id, estado'),
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  const profiles = (profilesRes.data ?? []) as ProfileRow[]
  const planes = (planesRes.data ?? []) as PlaneRow[]
  const parts = (partsRes.data ?? []) as PartRow[]
  const authUsers = usersRes.data?.users ?? []

  // ── Section 1: Stats ──────────────────────────────────────
  const totalUsers = profiles.length
  const completedOnboarding = profiles.filter(p => p.onboarding_completado).length
  const totalPlanes = planes.filter(p => p.estado === 'pendiente').length
  const totalHistorias = planes.filter(p => p.estado === 'hecho').length

  // ── Section 2: Buyer persona ─────────────────────────────
  const interesCount: Record<string, number> = {}
  for (const p of profiles) {
    for (const i of p.intereses ?? []) {
      interesCount[i] = (interesCount[i] ?? 0) + 1
    }
  }
  const intereses = Object.entries(interesCount)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))

  const conQuienCount: Record<string, number> = {}
  for (const p of profiles) {
    for (const c of p.con_quien_vive ?? []) {
      conQuienCount[c] = (conQuienCount[c] ?? 0) + 1
    }
  }
  const conQuien = Object.entries(conQuienCount)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))

  const edadCount: Record<number, number> = {}
  for (const p of profiles) {
    if (p.edad != null) {
      edadCount[p.edad] = (edadCount[p.edad] ?? 0) + 1
    }
  }
  const edades = Object.entries(edadCount)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([edad, count]) => ({ edad: Number(edad), count }))

  // ── Section 3: Activity ───────────────────────────────────
  const now = new Date()
  const newUsersByDay: { date: string; label: string; count: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i))
    const dateStr = d.toISOString().slice(0, 10)
    const count = authUsers.filter(u => u.created_at.slice(0, 10) === dateStr).length
    if (count > 0) {
      const label = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' })
      newUsersByDay.push({ date: dateStr, label: label.charAt(0).toUpperCase() + label.slice(1), count })
    }
  }

  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - 30)
  const planTitleCount: Record<string, number> = {}
  for (const p of planes.filter(p => new Date(p.created_at) > cutoff)) {
    planTitleCount[p.titulo] = (planTitleCount[p.titulo] ?? 0) + 1
  }
  const popularPlanes = Object.entries(planTitleCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([titulo, count]) => ({ titulo, count }))

  const usersWithPlans = new Set(planes.map(p => p.pareja_codigo)).size
  const usersWithHistorias = new Set(planes.filter(p => p.estado === 'hecho').map(p => p.pareja_codigo)).size
  const planOwnerMap = new Map(planes.map(p => [p.id, p.pareja_codigo]))
  const usersWithInvitations = new Set(
    parts
      .filter(p => p.estado === 'invitado')
      .map(p => planOwnerMap.get(p.plan_id))
      .filter(Boolean)
  ).size

  // ── Section 4: Users table ────────────────────────────────
  const users = profiles
    .map(p => {
      const authUser = authUsers.find(u => u.id === p.id)
      const userPlanes = planes.filter(pl => pl.pareja_codigo === p.id)
      return {
        id: p.id,
        nombre: p.nombre,
        username: p.username,
        email: authUser?.email ?? p.email ?? '',
        created_at: authUser?.created_at ?? p.created_at ?? '',
        planes_pendientes: userPlanes.filter(pl => pl.estado === 'pendiente').length,
        historias: userPlanes.filter(pl => pl.estado === 'hecho').length,
        onboarding_completado: p.onboarding_completado ?? false,
        intereses: p.intereses ?? [],
        edad: p.edad ?? null,
      }
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json({
    stats: { totalUsers, completedOnboarding, totalPlanes, totalHistorias },
    intereses,
    conQuien,
    edades,
    newUsersByDay,
    popularPlanes,
    conversion: { withPlans: usersWithPlans, withHistorias: usersWithHistorias, withInvitations: usersWithInvitations, total: totalUsers },
    users,
  })
}
