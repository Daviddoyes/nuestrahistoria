'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Map as MapIcon } from 'lucide-react'
import { getInicio, getMyProfile } from '@/lib/actions'
import { CATEGORIA_GRADIENTE } from '@/lib/gooals'
import AppShell, { PantallaCargando } from '@/components/AppShell'
import type { Profile, ResumenInicio, GooalResumen } from '@/types/gooals'

/**
 * La pantalla de entrada.
 *
 * ── POR QUÉ MANDA EL BUSCADOR ─────────────────────────────
 *
 * Esto no es una app de abrir cada día. Se abre para tres cosas: buscar algo
 * que hacer, comprobar si existe el gooal de algo que acabas de hacer, o mirar
 * a alguien. Las dos primeras son el mismo buscador, y por eso es lo primero y
 * lo más grande de la pantalla.
 *
 * El buscador no busca aquí: lleva a Explorar con lo escrito puesto. Repetir la
 * búsqueda en dos sitios sería mantener dos veces lo mismo, y allí ya está todo
 * —los filtros, el scroll infinito y el "proponlo" cuando no hay resultados—
 * funcionando.
 */
export default function InicioPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [resumen, setResumen] = useState<ResumenInicio | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const cargar = useCallback(async () => {
    try {
      const [prof, res] = await Promise.all([getMyProfile(), getInicio()])
      if (!prof) { router.push('/'); return }
      setProfile(prof)
      setResumen(res)
      setError('')
    } catch (e) {
      console.error('[inicio]', e)
      setError('No hemos podido cargar tu inicio. Inténtalo de nuevo.')
    } finally {
      setCargando(false)
    }
  }, [router])

  useEffect(() => { cargar() }, [cargar])

  const buscar = (e: React.FormEvent) => {
    e.preventDefault()
    const q = busqueda.trim()
    router.push(q ? `/explorar?q=${encodeURIComponent(q)}` : '/explorar')
  }

  if (cargando) return <PantallaCargando />
  if (!profile) return null

  return (
    <AppShell tab="inicio" fotoPerfil={profile.foto_perfil_url}>
      <div style={{ padding: '4px 20px 32px' }}>

        {/* ── El buscador ────────────────────────────────── */}
        <form onSubmit={buscar}>
          <label
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#161817', border: '1px solid #2A2E2C', borderRadius: 14,
              padding: '0 14px', minHeight: 52,
            }}
          >
            <Search aria-hidden style={{ width: 17, height: 17, flexShrink: 0, color: '#7A8A85' }} />
            <input
              type="search"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              // Las dos preguntas no caben en 390 px a 16 px de letra: se
              // cortaba a mitad de la segunda. La primera va aquí y la segunda
              // justo debajo, que además es donde se explica lo de proponer.
              placeholder="¿Qué quieres hacer?"
              aria-label="Buscar un gooal"
              // 16px o más: con menos, iOS hace zoom al tocar el campo y
              // la pantalla se queda descolocada.
              style={{
                flex: 1, minWidth: 0, background: 'transparent', border: 'none',
                outline: 'none', color: '#FFFFFF', fontSize: 16,
              }}
            />
          </label>
        </form>
        <p style={{ fontSize: 12, color: '#55605C', padding: '8px 2px 0', lineHeight: 1.5 }}>
          O busca algo que ya hayas hecho, para marcarlo. Si no está, puedes proponerlo.
        </p>

        {/* ── Tus tres cifras ────────────────────────────── */}
        {resumen && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13, color: '#7A8A85', padding: '16px 2px 4px' }}>
            <span><b style={{ color: '#FFFFFF', fontWeight: 700 }}>{resumen.conseguidos}</b> conseguidos</span>
            <Punto />
            <span><b style={{ color: '#00D1A7', fontWeight: 700 }}>{resumen.puntos}</b> puntos</span>
            <Punto />
            <span><b style={{ color: '#FFFFFF', fontWeight: 700 }}>{resumen.pendientes}</b> pendientes</span>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-[#FF5252] bg-[rgba(255,82,82,0.14)] px-3 py-2 rounded-lg mt-4">{error}</p>
        )}

        {/* ── Sigue con lo tuyo ──────────────────────────── */}
        {resumen && resumen.siguientes.length > 0 && (
          <section style={{ marginTop: 18 }}>
            <Cabecera titulo="Sigue con lo tuyo" enlace="/perfil" texto={`Ver los ${resumen.pendientes}`} />
            <Tira gooals={resumen.siguientes.map(s => s.gooal)} />
          </section>
        )}

        {resumen && resumen.siguientes.length === 0 && (
          <section style={{ marginTop: 18, background: '#161817', borderRadius: 16, padding: 16 }}>
            <p style={{ fontSize: 14, color: '#FFFFFF', fontWeight: 600 }}>Aún no tienes nada pendiente.</p>
            <p style={{ fontSize: 13, color: '#7A8A85', marginTop: 4, lineHeight: 1.5 }}>
              Busca algo que te apetezca y añádelo a tu lista.
            </p>
            <Link
              href="/explorar"
              className="active:bg-[#00B893] transition-colors"
              style={{
                display: 'inline-flex', alignItems: 'center', minHeight: 44, marginTop: 12,
                padding: '0 18px', borderRadius: 12, background: '#00D1A7',
                color: '#0B0B0B', fontSize: 14, fontWeight: 600,
              }}
            >
              Explorar gooals
            </Link>
          </section>
        )}

        {/* PROVISIONAL: el mapa dejó de ser la pantalla de entrada y todavía no
            es una pestaña de Explorar. Sin este enlace no se llegaría a él desde
            ninguna parte. Se quita cuando el mapa entre en Explorar. */}
        <Link
          href="/mapa"
          className="active:bg-[#1E2120] transition-colors"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            minHeight: 44, marginTop: 24, borderRadius: 12,
            border: '1px solid #2A2E2C', color: '#A3B1AC', fontSize: 13, fontWeight: 600,
          }}
        >
          <MapIcon aria-hidden style={{ width: 16, height: 16 }} /> Ver el mapa
        </Link>
      </div>
    </AppShell>
  )
}

function Punto() {
  return <span aria-hidden style={{ width: 3, height: 3, borderRadius: '50%', background: '#3A423F' }} />
}

function Cabecera({ titulo, enlace, texto }: { titulo: string; enlace: string; texto: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>{titulo}</h2>
      <Link href={enlace} style={{ fontSize: 12, color: '#00D1A7', whiteSpace: 'nowrap' }}>{texto}</Link>
    </div>
  )
}

/**
 * Una fila que se desliza. Sangra hasta los bordes de la pantalla para que se
 * note que hay más a la derecha; si acabara en el margen, parecería cortada.
 */
function Tira({ gooals }: { gooals: GooalResumen[] }) {
  return (
    <div style={{ margin: '0 -20px' }}>
      <div
        style={{
          display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none',
          padding: '0 20px 4px',
        }}
      >
        {gooals.map(g => (
          <Link
            key={g.id}
            href={`/explorar?q=${encodeURIComponent(g.titulo)}`}
            className="active:opacity-80 transition-opacity"
            style={{
              flex: '0 0 148px', height: 112, borderRadius: 14, position: 'relative',
              overflow: 'hidden', border: '1px solid #2A2E2C',
              background: g.imagen_url ? '#161817' : CATEGORIA_GRADIENTE[g.categoria],
            }}
          >
            {g.imagen_url && (
              // eslint-disable-next-line @next/next/no-img-element -- fotos del catálogo de tamaño variable
              <img
                src={g.imagen_url}
                alt=""
                loading="lazy"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
            <span
              aria-hidden
              style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(5,6,6,0.94), rgba(5,6,6,0) 62%)' }}
            />
            <span
              style={{
                position: 'absolute', top: 7, right: 7, fontSize: 10, fontWeight: 700,
                background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.13)',
                borderRadius: 20, padding: '3px 7px', color: '#00D1A7',
              }}
            >
              {g.puntos}
            </span>
            <span
              style={{
                position: 'absolute', left: 9, right: 9, bottom: 8,
                fontSize: 11.5, lineHeight: 1.3, color: '#FFFFFF', fontWeight: 500,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              } as React.CSSProperties}
            >
              {g.titulo}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
