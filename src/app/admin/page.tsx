'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, LogOut } from 'lucide-react'
import ExperienciasSection from '@/components/admin/ExperienciasSection'
import GooalsSection from '@/components/admin/GooalsSection'

const ADMIN_PASSWORD = 'LivestoryAdmin2024'
const STORAGE_KEY = 'admin_auth'

type Stats = {
  totalUsers: number
  completedOnboarding: number
  totalPlanes: number
  totalHistorias: number
}

type BarItem = { name: string; count: number }

type UserRow = {
  id: string
  nombre: string
  username: string | null
  email: string
  created_at: string
  planes_pendientes: number
  historias: number
  onboarding_completado: boolean
  intereses: string[]
  edad: number | null
}

type AdminData = {
  stats: Stats
  intereses: BarItem[]
  conQuien: BarItem[]
  edades: { edad: number; count: number }[]
  newUsersByDay: { date: string; label: string; count: number }[]
  popularPlanes: { titulo: string; count: number }[]
  conversion: { withPlans: number; withHistorias: number; withInvitations: number; total: number }
  users: UserRow[]
}

// ── Sub-components ─────────────────────────────────────────

function MetricCard({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  return (
    <div style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: 12, padding: 16 }}>
      <p style={{ fontSize: 30, fontWeight: 700, color: '#E8692A', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 11, color: '#666666', marginTop: 6, lineHeight: 1.3 }}>{label}</p>
      {sub && <p style={{ fontSize: 10, color: '#444444', marginTop: 3 }}>{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#666666', marginBottom: 16 }}>
      {children}
    </p>
  )
}

function SubTitle({ children }: { children: string }) {
  return (
    <p style={{ fontSize: 11, color: '#888888', fontWeight: 500, marginBottom: 10 }}>{children}</p>
  )
}

function Divider() {
  return <div style={{ height: 1, background: '#1A1A1A', margin: '28px 0' }} />
}

function BarChart({ items }: { items: BarItem[] }) {
  const max = Math.max(...items.map(i => i.count), 1)
  if (items.length === 0) return <p style={{ fontSize: 13, color: '#444444' }}>Sin datos</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map(item => (
        <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: '#C0C0C0', width: 140, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.name}
          </span>
          <div style={{ flex: 1, height: 20, background: '#1A1A1A', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#E8692A', borderRadius: 3, width: `${(item.count / max) * 100}%` }} />
          </div>
          <span style={{ fontSize: 12, color: '#E8692A', fontWeight: 600, width: 24, textAlign: 'right', flexShrink: 0 }}>
            {item.count}
          </span>
        </div>
      ))}
    </div>
  )
}

function ConversionRow({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#C0C0C0' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#E8692A' }}>{pct}% ({value})</span>
      </div>
      <div style={{ height: 6, background: '#1A1A1A', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#E8692A', borderRadius: 3, width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true') {
      setAuthed(true)
    }
  }, [])

  useEffect(() => {
    if (authed) loadData()
  }, [authed]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, 'true')
      setAuthed(true)
      setPasswordError(false)
    } else {
      setPasswordError(true)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setAuthed(false)
    setData(null)
  }

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin-stats', {
        headers: { 'x-admin-key': ADMIN_PASSWORD },
      })
      if (!res.ok) throw new Error('Error del servidor')
      setData(await res.json())
    } catch {
      setError('No se pudieron cargar los datos. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ── Password gate ────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: '100dvh', background: '#0A0A0A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <div style={{ width: '100%', maxWidth: 340 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.25em', color: '#E8692A', textTransform: 'uppercase', marginBottom: 8 }}>
              LIVESTORY ADMIN
            </p>
            <div style={{ width: 40, height: 1, background: '#E8692A', margin: '0 auto' }} />
          </div>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setPasswordError(false) }}
              placeholder="Contraseña de administrador"
              autoFocus
              style={{
                padding: '14px 16px', borderRadius: 12,
                border: `1px solid ${passwordError ? '#8B3A3A' : '#2A2A2A'}`,
                background: '#1A1A1A', color: '#F0F0F0', fontSize: 16,
                outline: 'none', width: '100%', boxSizing: 'border-box',
              }}
            />
            {passwordError && (
              <p style={{ fontSize: 13, color: '#C97B7B' }}>Contraseña incorrecta</p>
            )}
            <button
              type="submit"
              style={{ padding: '14px 0', borderRadius: 12, background: '#E8692A', color: '#fff', fontWeight: 600, fontSize: 15, border: 'none', cursor: 'pointer' }}
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Dashboard ────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: '#0A0A0A', paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#0A0A0A', borderBottom: '1px solid #1A1A1A', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.25em', color: '#E8692A', textTransform: 'uppercase' }}>
          LIVESTORY ADMIN
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={loadData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666666', background: 'none', border: 'none', cursor: 'pointer', opacity: loading ? 0.4 : 1 }}
          >
            <RefreshCw style={{ width: 13, height: 13 }} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666666', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <LogOut style={{ width: 13, height: 13 }} />
            Salir
          </button>
        </div>
      </div>

      {error && (
        <div style={{ margin: '16px 16px 0', padding: '12px 16px', background: 'rgba(139,58,58,0.15)', border: '1px solid rgba(139,58,58,0.4)', borderRadius: 12, fontSize: 13, color: '#C97B7B' }}>
          {error}
        </div>
      )}

      {loading && !data && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <div className="w-6 h-6 border-2 border-[#2A2A2A] border-t-[#E8692A] rounded-full animate-spin" />
        </div>
      )}

      {data && (
        <div style={{ padding: '24px 16px 0' }}>

          {/* ── Section 1: Métricas ── */}
          <SectionTitle>Métricas principales</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 0 }}>
            <MetricCard value={data.stats.totalUsers} label="Usuarios registrados" />
            <MetricCard
              value={data.stats.completedOnboarding}
              label="Completaron onboarding"
              sub={`${data.stats.totalUsers ? Math.round(data.stats.completedOnboarding / data.stats.totalUsers * 100) : 0}% del total`}
            />
            <MetricCard value={data.stats.totalPlanes} label="Planes activos" />
            <MetricCard value={data.stats.totalHistorias} label="Historias completadas" />
          </div>

          <Divider />

          {/* ── Section 2: Buyer Persona ── */}
          <SectionTitle>Buyer Persona</SectionTitle>

          <SubTitle>Intereses más elegidos</SubTitle>
          <BarChart items={data.intereses} />

          <div style={{ marginTop: 20 }}>
            <SubTitle>Con quién prefieren vivir experiencias</SubTitle>
            <BarChart items={data.conQuien} />
          </div>

          <div style={{ marginTop: 20 }}>
            <SubTitle>Distribución por edad</SubTitle>
            <BarChart items={data.edades.map(e => ({ name: `${e.edad} años`, count: e.count }))} />
          </div>

          <Divider />

          {/* ── Section 3: Actividad ── */}
          <SectionTitle>Actividad</SectionTitle>

          <SubTitle>Nuevos usuarios — últimos 14 días</SubTitle>
          {data.newUsersByDay.length === 0 ? (
            <p style={{ fontSize: 13, color: '#444444' }}>Sin registros recientes</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {data.newUsersByDay.map(d => (
                <div key={d.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1A1A1A' }}>
                  <span style={{ fontSize: 13, color: '#C0C0C0' }}>{d.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#E8692A' }}>
                    {d.count} {d.count === 1 ? 'usuario' : 'usuarios'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <SubTitle>Planes más populares (últimos 30 días)</SubTitle>
            <BarChart items={data.popularPlanes.map(p => ({ name: p.titulo, count: p.count }))} />
          </div>

          <div style={{ marginTop: 24 }}>
            <SubTitle>Ratio de conversión</SubTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <ConversionRow label="Crearon al menos 1 plan" value={data.conversion.withPlans} total={data.conversion.total} />
              <ConversionRow label="Completaron al menos 1 historia" value={data.conversion.withHistorias} total={data.conversion.total} />
              <ConversionRow label="Invitaron a alguien" value={data.conversion.withInvitations} total={data.conversion.total} />
            </div>
          </div>

          <Divider />

          {/* ── Section 4: Tabla de usuarios ── */}
          <SectionTitle>{`Usuarios (${data.users.length})`}</SectionTitle>

          <div style={{ overflowX: 'auto', marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
            <table style={{ width: '100%', minWidth: 780, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Nombre', '@username', 'Email', 'Registro', 'Planes', 'Historias', 'Onboarding', 'Intereses'].map(h => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left', fontSize: 9, textTransform: 'uppercase',
                        letterSpacing: '0.14em', color: '#E8692A', fontWeight: 600,
                        paddingBottom: 8, paddingRight: 14, whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.users.map((u, i) => (
                  <tr key={u.id} style={{ background: i % 2 === 0 ? '#0A0A0A' : '#141414' }}>
                    <td style={{ padding: '10px 14px 10px 0', color: '#F0F0F0', whiteSpace: 'nowrap' }}>{u.nombre}</td>
                    <td style={{ padding: '10px 14px 10px 0', color: '#666666', whiteSpace: 'nowrap' }}>
                      {u.username ? `@${u.username}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px 10px 0', color: '#666666', whiteSpace: 'nowrap' }}>{u.email}</td>
                    <td style={{ padding: '10px 14px 10px 0', color: '#666666', whiteSpace: 'nowrap' }}>
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })
                        : '—'}
                    </td>
                    <td style={{ padding: '10px 14px 10px 0', color: '#F0F0F0', textAlign: 'center' }}>{u.planes_pendientes}</td>
                    <td style={{ padding: '10px 14px 10px 0', color: '#F0F0F0', textAlign: 'center' }}>{u.historias}</td>
                    <td style={{ padding: '10px 14px 10px 0', textAlign: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: u.onboarding_completado ? '#6BBF6B' : '#444444' }}>
                        {u.onboarding_completado ? '✓' : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 0 10px 0' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {u.intereses.slice(0, 3).map(int => (
                          <span
                            key={int}
                            style={{
                              fontSize: 9, padding: '2px 6px', borderRadius: 20,
                              background: 'rgba(232,105,42,0.1)', color: '#E8692A',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {int}
                          </span>
                        ))}
                        {u.intereses.length > 3 && (
                          <span style={{ fontSize: 9, color: '#444444' }}>+{u.intereses.length - 3}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Divider />

          {/* ── Section 5: Gooals ── */}
          <GooalsSection />

          <Divider />

          {/* ── Section 6: Biblioteca de experiencias (legado, fuente de la migración) ── */}
          <ExperienciasSection />

        </div>
      )}
    </div>
  )
}
