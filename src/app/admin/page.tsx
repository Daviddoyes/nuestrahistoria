'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { RefreshCw, ArrowLeft } from 'lucide-react'
import GooalsV2Section from '@/components/admin/GooalsV2Section'
import SugerenciasSection from '@/components/admin/SugerenciasSection'
import RelanzamientoSection from '@/components/admin/RelanzamientoSection'


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
    <div style={{ background: '#1E2120', border: '1px solid #2A2E2C', borderRadius: 12, padding: 16 }}>
      <p style={{ fontSize: 30, fontWeight: 700, color: '#00D1A7', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 11, color: '#7A8A85', marginTop: 6, lineHeight: 1.3 }}>{label}</p>
      {sub && <p style={{ fontSize: 10, color: '#7A8A85', marginTop: 3 }}>{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#7A8A85', marginBottom: 16 }}>
      {children}
    </p>
  )
}

function SubTitle({ children }: { children: string }) {
  return (
    <p style={{ fontSize: 11, color: '#A3B1AC', fontWeight: 500, marginBottom: 10 }}>{children}</p>
  )
}

function Divider() {
  return <div style={{ height: 1, background: '#2A2E2C', margin: '28px 0' }} />
}

function BarChart({ items }: { items: BarItem[] }) {
  const max = Math.max(...items.map(i => i.count), 1)
  if (items.length === 0) return <p style={{ fontSize: 13, color: '#7A8A85' }}>Sin datos</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map(item => (
        <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: '#A3B1AC', width: 140, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.name}
          </span>
          <div style={{ flex: 1, height: 20, background: '#2A2E2C', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#00D1A7', borderRadius: 3, width: `${(item.count / max) * 100}%` }} />
          </div>
          <span style={{ fontSize: 12, color: '#00D1A7', fontWeight: 600, width: 24, textAlign: 'right', flexShrink: 0 }}>
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
        <span style={{ fontSize: 12, color: '#A3B1AC' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#00D1A7' }}>{pct}% ({value})</span>
      </div>
      <div style={{ height: 6, background: '#2A2E2C', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#00D1A7', borderRadius: 3, width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────

export default function AdminPage() {
  // 'comprobando' hasta que el servidor responde; no hay contraseña que
  // guardar en el navegador, el permiso es el de tu sesión de Supabase.
  const [acceso, setAcceso] = useState<'comprobando' | 'si' | 'no'>('comprobando')
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // Sin cabeceras: la cookie de sesión identifica al usuario y el servidor
      // comprueba profiles.es_admin.
      const res = await fetch('/api/admin-stats')
      if (res.status === 401) { setAcceso('no'); return }
      if (!res.ok) throw new Error('Error del servidor')
      setData(await res.json())
      setAcceso('si')
    } catch {
      setError('No se pudieron cargar los datos. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Sin permiso ──────────────────────────────────────────
  if (acceso !== 'si') {
    return (
      <div style={{ minHeight: '100dvh', background: '#0B0B0B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <div style={{ width: '100%', maxWidth: 340, textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.25em', color: '#00D1A7', textTransform: 'uppercase', marginBottom: 8 }}>
            GooALS ADMIN
          </p>
          <div style={{ width: 40, height: 1, background: '#00D1A7', margin: '0 auto 28px' }} />
          {acceso === 'comprobando' ? (
            <p style={{ fontSize: 14, color: '#7A8A85' }}>Comprobando tu acceso...</p>
          ) : (
            <>
              <p style={{ fontSize: 15, color: '#A3B1AC', lineHeight: 1.6, marginBottom: 10 }}>
                Esta cuenta no tiene acceso al panel.
              </p>
              <p style={{ fontSize: 13, color: '#7A8A85', lineHeight: 1.6 }}>
                Inicia sesión con una cuenta de administrador. Los permisos se
                dan desde Supabase, en la columna <code>es_admin</code> de <code>profiles</code>.
              </p>
              <Link
                href="/"
                style={{ display: 'inline-block', marginTop: 24, padding: '12px 22px', borderRadius: 12, background: '#00D1A7', color: '#0B0B0B', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}
              >
                Ir al inicio
              </Link>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Dashboard ────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: '#0B0B0B', paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#0B0B0B', borderBottom: '1px solid #2A2E2C', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.25em', color: '#00D1A7', textTransform: 'uppercase' }}>
          GooALS ADMIN
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={loadData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#7A8A85', background: 'none', border: 'none', cursor: 'pointer', opacity: loading ? 0.4 : 1 }}
          >
            <RefreshCw style={{ width: 13, height: 13 }} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <Link
            href="/"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#7A8A85', textDecoration: 'none' }}
          >
            <ArrowLeft style={{ width: 13, height: 13 }} />
            Volver a la app
          </Link>
        </div>
      </div>

      {error && (
        <div style={{ margin: '16px 16px 0', padding: '12px 16px', background: 'rgba(255,82,82,0.14)', border: '1px solid rgba(255,82,82,0.35)', borderRadius: 12, fontSize: 13, color: '#FF5252' }}>
          {error}
        </div>
      )}

      {loading && !data && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <div className="w-6 h-6 border-2 border-[#2A2E2C] border-t-[#00D1A7] rounded-full animate-spin" />
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
            <p style={{ fontSize: 13, color: '#7A8A85' }}>Sin registros recientes</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {data.newUsersByDay.map(d => (
                <div key={d.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #2A2E2C' }}>
                  <span style={{ fontSize: 13, color: '#A3B1AC' }}>{d.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#00D1A7' }}>
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
                        letterSpacing: '0.14em', color: '#00D1A7', fontWeight: 600,
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
                  <tr key={u.id} style={{ background: i % 2 === 0 ? '#0B0B0B' : '#1E2120' }}>
                    <td style={{ padding: '10px 14px 10px 0', color: '#FFFFFF', whiteSpace: 'nowrap' }}>{u.nombre}</td>
                    <td style={{ padding: '10px 14px 10px 0', color: '#7A8A85', whiteSpace: 'nowrap' }}>
                      {u.username ? `@${u.username}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px 10px 0', color: '#7A8A85', whiteSpace: 'nowrap' }}>{u.email}</td>
                    <td style={{ padding: '10px 14px 10px 0', color: '#7A8A85', whiteSpace: 'nowrap' }}>
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })
                        : '—'}
                    </td>
                    <td style={{ padding: '10px 14px 10px 0', color: '#FFFFFF', textAlign: 'center' }}>{u.planes_pendientes}</td>
                    <td style={{ padding: '10px 14px 10px 0', color: '#FFFFFF', textAlign: 'center' }}>{u.historias}</td>
                    <td style={{ padding: '10px 14px 10px 0', textAlign: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: u.onboarding_completado ? '#00D1A7' : '#7A8A85' }}>
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
                              background: 'rgba(0,209,167,0.1)', color: '#00D1A7',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {int}
                          </span>
                        ))}
                        {u.intereses.length > 3 && (
                          <span style={{ fontSize: 9, color: '#7A8A85' }}>+{u.intereses.length - 3}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Divider />

          {/* ── Section 5: Correo a los usuarios existentes (Fase 3d) ── */}
          <RelanzamientoSection />

          <Divider />

          {/* ── Section 6: Sugerencias de la comunidad (Fase 3b) ── */}
          <SugerenciasSection />

          <Divider />

          {/* ── Section 7: Catálogo Gooals V2 (Fase 3) ── */}
          <GooalsV2Section />

        </div>
      )}
    </div>
  )
}
