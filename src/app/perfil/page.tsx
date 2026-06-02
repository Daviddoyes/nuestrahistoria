'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Copy, Check, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import type { Profile, Plan } from '@/types/planes'

type TabPerfil = 'planes' | 'historias'

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
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<TabPerfil>('planes')

  useEffect(() => {
    const load = async () => {
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
    }
    load()
  }, [supabase, router])

  const pendientes = planes.filter(p => p.estado === 'pendiente')
    .sort((a, b) => a.orden - b.orden || a.created_at.localeCompare(b.created_at))
  const historias = planes.filter(p => p.estado === 'hecho')
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

  const handleSharePerfil = () => {
    const text = `Únete a mis planes en Livestory: livestory.app/@${profile?.username ?? ''}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
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
      {/* Header */}
      <header
        className="bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#2A2A2A] sticky top-0 z-10"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center justify-between px-5 h-12">
          <span className="font-serif font-semibold text-[#F0F0F0] tracking-tight">Perfil</span>
          <button
            onClick={handleLogout}
            className="text-[#444444] active:text-[#E8692A] p-1.5"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div
        className="px-5"
        style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 1rem)' }}
      >
        {/* Profile header */}
        <div className="pt-6 pb-5 flex flex-col items-center gap-3">
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
          <div className="flex items-center gap-0 border border-[#2A2A2A] rounded-2xl overflow-hidden">
            <div className="flex flex-col items-center px-5 py-2.5">
              <span className="text-lg font-bold text-[#F0F0F0]">{pendientes.length}</span>
              <span className="text-[10px] uppercase tracking-[0.1em] text-[#555555]">Planes</span>
            </div>
            <div className="w-px h-10 bg-[#2A2A2A]" />
            <div className="flex flex-col items-center px-5 py-2.5">
              <span className="text-lg font-bold text-[#F0F0F0]">{historias.length}</span>
              <span className="text-[10px] uppercase tracking-[0.1em] text-[#555555]">Historias</span>
            </div>
            <div className="w-px h-10 bg-[#2A2A2A]" />
            <div className="flex flex-col items-center px-5 py-2.5">
              <span className="text-lg font-bold text-[#F0F0F0]">{planes.length}</span>
              <span className="text-[10px] uppercase tracking-[0.1em] text-[#555555]">Total</span>
            </div>
          </div>

          {/* Share profile button */}
          <button
            onClick={handleSharePerfil}
            className="flex items-center gap-2 px-4 py-2.5 border border-[#2A2A2A] rounded-xl text-sm text-[#F0F0F0] active:bg-[#1A1A1A] transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-[#E8692A]" /> : <Copy className="w-4 h-4 text-[#666666]" />}
            {copied ? '¡Enlace copiado!' : 'Compartir mi perfil'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#1A1A1A] p-1 rounded-xl mb-4">
          <button
            onClick={() => setActiveTab('planes')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'planes' ? 'bg-[#E8692A] text-white' : 'text-[#666666]'
            }`}
          >
            Mis Planes
          </button>
          <button
            onClick={() => setActiveTab('historias')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'historias' ? 'bg-[#E8692A] text-white' : 'text-[#666666]'
            }`}
          >
            Mis Historias
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'planes' ? (
          pendientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-16 gap-2 text-center">
              <p className="text-base font-medium text-[#F0F0F0]">Sin planes pendientes</p>
              <p className="text-sm text-[#666666]">Ve a Planes para añadir el primero</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendientes.map(plan => (
                <div
                  key={plan.id}
                  className="bg-[#141414] rounded-xl border border-[#2A2A2A] p-4"
                  style={{ borderLeft: '3px solid #E8692A' }}
                >
                  <h3 className="font-serif font-semibold text-[#F0F0F0] text-sm leading-snug">{plan.titulo}</h3>
                  {plan.descripcion && (
                    <p className="text-[#666666] text-xs leading-relaxed mt-1">{plan.descripcion}</p>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          historias.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-16 gap-2 text-center">
              <p className="text-base font-medium text-[#F0F0F0]">Sin historias aún</p>
              <p className="text-sm text-[#666666]">Completa un plan para crear tu primera historia</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {historias.map(plan => (
                <div
                  key={plan.id}
                  className="relative rounded-xl overflow-hidden bg-[#141414] border border-[#2A2A2A]"
                  style={{ aspectRatio: '3/4' }}
                >
                  {plan.foto_url ? (
                    <img src={plan.foto_url} alt={plan.titulo} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-3">
                      <p className="font-serif text-xs text-[#F0F0F0] text-center leading-snug">{plan.titulo}</p>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="font-serif text-xs font-semibold text-white leading-tight line-clamp-2">{plan.titulo}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <BottomNav profile={profile} />
    </div>
  )
}
