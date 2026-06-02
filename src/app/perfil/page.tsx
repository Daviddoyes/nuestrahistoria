'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, LogOut, Plus, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { addPlan, deletePlan } from '@/lib/actions'
import BottomNav from '@/components/BottomNav'
import NuevoPlanModal from '@/components/NuevoPlanModal'
import HistoriaDetailModal from '@/components/HistoriaDetailModal'
import ShareBucketList from '@/components/ShareBucketList'
import type { Plan, Profile } from '@/types/planes'

function Avatar({ profile, size = 80 }: { profile: Profile; size?: number }) {
  const initial = profile.nombre?.[0]?.toUpperCase() ?? '?'
  if (profile.foto_perfil_url) {
    return (
      <img
        src={profile.foto_perfil_url}
        alt={profile.nombre}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: '#E8692A', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff',
    }}>
      {initial}
    </div>
  )
}

export default function PerfilPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [planes, setPlanes] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [showNuevoPlan, setShowNuevoPlan] = useState(false)
  const [selectedHistoria, setSelectedHistoria] = useState<Plan | null>(null)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const [{ data: prof }, { data: myPlanes }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('planes').select('*').eq('pareja_codigo', user.id),
    ])

    if (!prof) { router.push('/'); return }
    setProfile(prof as Profile)
    setPlanes((myPlanes ?? []) as Plan[])
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { fetchData() }, [fetchData])

  const pendientes = planes
    .filter(p => p.estado === 'pendiente')
    .sort((a, b) => a.orden - b.orden || a.created_at.localeCompare(b.created_at))

  const historias = planes
    .filter(p => p.estado === 'hecho')
    .sort((a, b) => (b.fecha_momento ?? b.created_at).localeCompare(a.fecha_momento ?? a.created_at))

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploadingFoto(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${profile.id}/avatar.${ext}`
      const { error: upError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upError) throw upError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const urlWithBust = `${publicUrl}?t=${Date.now()}`
      await supabase.from('profiles').update({ foto_perfil_url: urlWithBust }).eq('id', profile.id)
      setProfile(prev => prev ? { ...prev, foto_perfil_url: urlWithBust } : prev)
    } catch (err) {
      console.error('Avatar upload error:', err)
    } finally {
      setUploadingFoto(false)
    }
  }

  const handleAddPlan = async (titulo: string, invitadoIds: string[]) => {
    const result = await addPlan(titulo, null, 'todos', invitadoIds)
    if (!result.success) throw new Error(result.error ?? 'Error al añadir el plan')
    setShowNuevoPlan(false)
    await fetchData()
  }

  const handleDeleteHistoria = async (id: string) => {
    await deletePlan(id)
    setSelectedHistoria(null)
    await fetchData()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#2A2A2A] border-t-[#E8692A] rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <header
        className="bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#2A2A2A] sticky top-0 z-10"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center justify-between px-5 h-12">
          <span className="font-serif font-semibold text-[#F0F0F0] tracking-tight">Perfil</span>
          <button
            onClick={handleLogout}
            className="text-[#444444] active:text-[#E8692A] min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div
        className="px-5"
        style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
      >
        {/* Profile header */}
        <div className="pt-6 pb-6 flex flex-col items-center gap-3">
          {/* Avatar with upload button */}
          <div className="relative">
            <Avatar profile={profile} size={80} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFoto}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#E8692A] border-2 border-[#0A0A0A] flex items-center justify-center text-white active:scale-95 transition-transform disabled:opacity-60"
              aria-label="Cambiar foto"
            >
              {uploadingFoto ? (
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFotoChange}
            />
          </div>

          {/* Name + username */}
          <div className="text-center">
            <h1 className="font-serif text-xl font-bold text-[#F0F0F0]">{profile.nombre}</h1>
            {profile.username && (
              <p className="text-sm text-[#555555] mt-0.5">@{profile.username}</p>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center border border-[#2A2A2A] rounded-2xl overflow-hidden">
            <div className="flex flex-col items-center px-7 py-2.5">
              <span className="text-lg font-bold text-[#F0F0F0]">{pendientes.length}</span>
              <span className="text-[10px] uppercase tracking-[0.1em] text-[#555555]">Planes</span>
            </div>
            <div className="w-px h-10 bg-[#2A2A2A]" />
            <div className="flex flex-col items-center px-7 py-2.5">
              <span className="text-lg font-bold text-[#F0F0F0]">{historias.length}</span>
              <span className="text-[10px] uppercase tracking-[0.1em] text-[#555555]">Historias</span>
            </div>
          </div>

          {/* Share bucket list — only when 3+ pending plans */}
          {pendientes.length >= 3 && (
            <ShareBucketList
              planes={pendientes}
              nombre={profile.nombre || ''}
              username={profile.username}
              fotoPerfil={profile.foto_perfil_url}
            />
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-[#1A1A1A] mb-6" />

        {/* Planes section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-serif font-semibold text-[#F0F0F0] text-base">Mis planes</h2>
            <button
              onClick={() => setShowNuevoPlan(true)}
              className="w-9 h-9 rounded-xl bg-[#E8692A] flex items-center justify-center text-white active:bg-[#D4581A] transition-colors"
              aria-label="Añadir plan"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          {pendientes.length === 0 ? (
            <p className="text-sm text-[#444444] py-3">
              Sin planes pendientes. Toca + para añadir el primero.
            </p>
          ) : (
            <div className="divide-y divide-[#1A1A1A]">
              {pendientes.map(plan => (
                <div key={plan.id} className="flex items-center gap-3 py-[14px]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#E8692A] flex-shrink-0" />
                  <p className="flex-1 font-serif text-[#E0E0E0] text-sm leading-snug">{plan.titulo}</p>
                  <ChevronRight className="w-4 h-4 text-[#2A2A2A] flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historias section */}
        <div>
          <h2 className="font-serif font-semibold text-[#F0F0F0] text-base mb-2">Mis historias</h2>

          {historias.length === 0 ? (
            <p className="text-sm text-[#444444] py-3">
              Completa un plan para crear tu primera historia.
            </p>
          ) : (
            <div className="divide-y divide-[#1A1A1A]">
              {historias.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedHistoria(plan)}
                  className="w-full flex items-center gap-3 py-[14px] text-left active:bg-[#141414] rounded-lg transition-colors"
                >
                  {plan.foto_url ? (
                    <img
                      src={plan.foto_url}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] flex-shrink-0" />
                  )}
                  <p className="flex-1 font-serif text-[#E0E0E0] text-sm leading-snug">{plan.titulo}</p>
                  <ChevronRight className="w-4 h-4 text-[#2A2A2A] flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav profile={profile} />

      {showNuevoPlan && (
        <NuevoPlanModal
          onClose={() => setShowNuevoPlan(false)}
          onSubmit={handleAddPlan}
        />
      )}

      {selectedHistoria && (
        <HistoriaDetailModal
          plan={selectedHistoria}
          onClose={() => setSelectedHistoria(null)}
          isOwner={true}
          onUpdate={fetchData}
        />
      )}
    </div>
  )
}
