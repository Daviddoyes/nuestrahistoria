'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Settings, ChevronRight } from 'lucide-react'
import {
  getInicio, getMyProfile, getPerfil, getSugerencias, getGooalV2, getMisEstadosGooals, getMuroFeed,
} from '@/lib/actions'
import { MARCA, RADIO, SUPERFICIE, TEXTO } from '@/lib/estilo'
import AppShell, { PantallaCargando } from '@/components/AppShell'
import Tira, { CabeceraTira as Cabecera } from '@/components/TiraGooals'
import Avatar from '@/components/Avatar'
import GooalV2DetailModal from '@/components/GooalV2DetailModal'
import CelebracionPuntos from '@/components/CelebracionPuntos'
import ListaUsuariosModal from '@/components/ListaUsuariosModal'
import EditarPerfilModal from '@/components/EditarPerfilModal'
import BuscarUsuariosSheet from '@/components/BuscarUsuariosSheet'
import InvitarAmigoSheet from '@/components/InvitarAmigoSheet'
import AjustesSheet from '@/components/perfil/AjustesSheet'
import CabeceraTu, { esDiaUno } from '@/components/perfil/CabeceraTu'
import ParaEmpezar from '@/components/perfil/ParaEmpezar'
import type { ResultadoCompletado } from '@/components/AnadirFotoModal'
import type {
  Profile, ResumenInicio, GooalResumen, SugerenciasInicio, MuroPostFeed,
  GooalV2, EstadoUserGooal, PerfilCompleto,
} from '@/types/gooals'

/**
 * La pantalla de entrada, que es TU pantalla.
 *
 * ── POR QUÉ AQUÍ Y NO EN /perfil ──────────────────────────
 *
 * Esta pantalla vivía en /perfil y la entrada era otra cosa: un buscador grande
 * y tres tiras de tarjetas. Lo que se decidió el 9-10-2026 es que lo primero que
 * se ve al abrir sea **dónde estás tú**: tu nivel, tu universo de categorías y
 * tus cifras; y debajo, lo que te toca.
 *
 * **La dirección NO cambió a propósito.** Sigue siendo /inicio aunque ya no se
 * llame "Inicio", y eso no es pereza: el `start_url` del manifest apunta aquí,
 * así que mover la ruta habría dejado apuntando a un sitio viejo a todo el que
 * ya tiene la app instalada, hasta que su móvil refresque el manifest. En una
 * app instalada la dirección no la ve nadie; lo que ve la gente es qué sale.
 *
 * ── Y EL BUSCADOR GRANDE QUE HABÍA AQUÍ ───────────────────
 *
 * Tenía su razón escrita —"esto no es una app de abrir cada día, se abre para
 * buscar algo que hacer"— y esa razón no era mala: era de cuando la entrada
 * tenía que resolver sola las tres cosas. Ahora buscar es media barra de abajo,
 * así que repetirlo aquí arriba sería dos puertas a la misma habitación. Queda
 * la lupa de la esquina, que busca PERSONAS, que es lo único que Buscar no hace.
 */
export default function InicioPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [resumen, setResumen] = useState<ResumenInicio | null>(null)
  const [sugerencias, setSugerencias] = useState<SugerenciasInicio | null>(null)
  const [ultimoDelMuro, setUltimoDelMuro] = useState<MuroPostFeed | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [misEstados, setMisEstados] = useState<Record<string, EstadoUserGooal>>({})
  const [ficha, setFicha] = useState<GooalV2 | null>(null)
  const [abriendo, setAbriendo] = useState(false)
  const [celebracion, setCelebracion] = useState<ResultadoCompletado | null>(null)

  const [lista, setLista] = useState<'seguidores' | 'siguiendo' | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [editando, setEditando] = useState(false)
  const [invitando, setInvitando] = useState(false)
  /**
   * Los ajustes necesitan el perfil ENTERO, porque dentro está la imagen que se
   * comparte en Stories y esa pinta tus listas. No se pide al cargar la
   * pantalla: se pide al tocar el engranaje. Así la pantalla que más se abre no
   * paga una consulta que casi nadie usa.
   */
  const [ajustes, setAjustes] = useState<PerfilCompleto | null>(null)
  const [abriendoAjustes, setAbriendoAjustes] = useState(false)

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true)
    try {
      const [prof, res, sug, estados, muro] = await Promise.all([
        getMyProfile(), getInicio(), getSugerencias(), getMisEstadosGooals(), getMuroFeed(5),
      ])
      if (!prof) { router.push('/'); return }
      setProfile(prof)
      setResumen(res)
      setSugerencias(sug)
      setMisEstados(estados)
      setUltimoDelMuro(muro[0] ?? null)
      setError('')
    } catch (e) {
      console.error('[inicio]', e)
      setError('No hemos podido cargar tu pantalla. Inténtalo de nuevo.')
    } finally {
      setCargando(false)
    }
  }, [router])

  useEffect(() => { cargar() }, [cargar])

  const abrir = async (gooal: GooalResumen) => {
    if (abriendo) return
    setAbriendo(true)
    setError('')
    try {
      const g = await getGooalV2(gooal.id)
      if (g) setFicha(g)
      else setError('Este gooal ya no está disponible.')
    } catch (e) {
      console.error('[inicio:ficha]', e)
      setError('No hemos podido abrir este gooal. Inténtalo de nuevo.')
    } finally {
      setAbriendo(false)
    }
  }

  const abrirAjustes = async () => {
    if (abriendoAjustes) return
    setAbriendoAjustes(true)
    try {
      const p = await getPerfil()
      if (p) setAjustes(p)
      else setError('No hemos podido abrir los ajustes.')
    } catch (e) {
      console.error('[inicio:ajustes]', e)
      setError('No hemos podido abrir los ajustes. Inténtalo de nuevo.')
    } finally {
      setAbriendoAjustes(false)
    }
  }

  const handleLogout = async () => {
    const { createClient } = await import('@/lib/supabase/client')
    await createClient().auth.signOut()
    router.push('/')
  }

  if (cargando) return <PantallaCargando />
  if (!profile || !resumen) return null

  const diaUno = esDiaUno(resumen.conseguidos)
  // Con foto primero: una tarjeta de 104 px es sobre todo una imagen.
  const empezarPor = sugerencias
    ? [...sugerencias.gooals.filter(g => g.imagen_url), ...sugerencias.gooals.filter(g => !g.imagen_url)].slice(0, 2)
    : []

  return (
    <>
      <AppShell tab="inicio" fotoPerfil={profile.foto_perfil_url}>
        <div style={{ padding: '0 20px 32px' }}>

          {/* ── La barra de arriba: personas y ajustes ─────── */}
          <div style={{ display: 'flex', alignItems: 'center', minHeight: 44 }}>
            <button
              onClick={() => setBuscando(true)}
              aria-label="Buscar personas"
              className="text-[#7A8A85] active:text-[#00D1A7] transition-colors w-11 h-11 -ml-3 flex items-center justify-center"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={abrirAjustes}
              disabled={abriendoAjustes}
              aria-label="Ajustes"
              className="text-[#A3B1AC] active:text-[#00D1A7] transition-colors w-11 h-11 -mr-3 ml-auto flex items-center justify-center disabled:opacity-60"
            >
              {abriendoAjustes
                ? <span className="w-4 h-4 border-2 border-[#7A8A85] border-t-transparent rounded-full animate-spin" />
                : <Settings className="w-5 h-5" />}
            </button>
          </div>

          <CabeceraTu
            nombre={profile.nombre}
            foto={profile.foto_perfil_url}
            conseguidos={resumen.conseguidos}
            pendientes={resumen.pendientes}
            amigos={resumen.amigos}
            puntos={resumen.puntos}
            conteos={resumen.porCategoria}
            intereses={resumen.intereses}
            onBuscar={() => router.push('/explorar')}
            onAmigos={() => setLista('seguidores')}
          />

          {error && (
            <p role="alert" className="text-sm text-[#FF5252] bg-[rgba(255,82,82,0.14)] px-3 py-2 rounded-lg mt-4">{error}</p>
          )}

          {diaUno ? (
            /* El día uno no hay nada tuyo que seguir: lo que hay es por dónde
               empezar, y ya lo dice ParaEmpezar. Las tiras de abajo serían dos
               veces la misma lista de sugerencias. */
            <div style={{ marginTop: 18 }}>
              <ParaEmpezar gooals={empezarPor} onAbrir={abrir} />
            </div>
          ) : (
            <>
              {/* ── Sigue con lo tuyo ──────────────────────── */}
              {resumen.siguientes.length > 0 && (
                <section style={{ marginTop: 18 }}>
                  <Cabecera titulo="Sigue con lo tuyo" enlace="/perfil" texto={`Ver los ${resumen.pendientes}`} />
                  <Tira gooals={resumen.siguientes.map(s => s.gooal)} onAbrir={abrir} />
                </section>
              )}

              {resumen.siguientes.length === 0 && (
                <section style={{ marginTop: 18, background: SUPERFICIE.panel, borderRadius: RADIO.tarjeta, padding: 16 }}>
                  <p style={{ fontSize: TEXTO.cuerpoGrande, color: MARCA.sand, fontWeight: 600 }}>Aún no tienes nada pendiente.</p>
                  <p style={{ fontSize: TEXTO.cuerpo, color: MARCA.stone, marginTop: 4, lineHeight: 1.5 }}>
                    Busca algo que te apetezca y añádelo a tu lista.
                  </p>
                  <Link
                    href="/explorar"
                    className="active:bg-[#00B893] transition-colors"
                    style={{
                      display: 'inline-flex', alignItems: 'center', minHeight: 44, marginTop: 12,
                      padding: '0 18px', borderRadius: 12, background: MARCA.aurora,
                      color: MARCA.obsidian, fontSize: TEXTO.cuerpoGrande, fontWeight: 600,
                    }}
                  >
                    Explorar gooals
                  </Link>
                </section>
              )}

              {/* ── De lo que te interesa ──────────────────── */}
              {sugerencias && sugerencias.gooals.length > 0 && (
                <section style={{ marginTop: 22 }}>
                  {/* El criterio NO va impreso. Que se pueda explicar en una línea
                      era para que no fuera inventado, no para escribirlo en la
                      pantalla: vive en getSugerencias(), que es donde sirve. */}
                  <Cabecera titulo="De lo que te interesa" enlace="/explorar" texto="Explorar" />
                  <Tira gooals={sugerencias.gooals} onAbrir={abrir} />
                </section>
              )}
            </>
          )}

          {/* ── La línea social: la puerta del muro ────────── */}
          {/* El muro dejó de tener pestaña propia, y la razón importa: con la
              base casi sin seguimientos, una pestaña "Muro" está vacía para
              TODO EL MUNDO el primer día, y una pestaña siempre vacía enseña a
              no tocarla. Así que la puerta solo existe cuando hay algo detrás.
              Esta es su forma más simple —lo último que ha pasado—; la de "Ari
              y tú queréis hacer 6 cosas iguales" vendrá con las listas. */}
          {ultimoDelMuro && (
            <Link
              href="/muro"
              style={{
                display: 'flex', alignItems: 'center', gap: 12, marginTop: 22, height: 68,
                padding: '0 14px', borderRadius: RADIO.tarjeta,
                background: SUPERFICIE.panel, border: `1px solid ${SUPERFICIE.linea}`,
              }}
            >
              <Avatar nombre={ultimoDelMuro.autor.nombre} foto={ultimoDelMuro.autor.foto_perfil_url} size={40} neutro />
              <span style={{ minWidth: 0, fontSize: 12.5, lineHeight: 1.35, color: MARCA.sand }}>
                <b style={{ fontWeight: 650 }}>{ultimoDelMuro.autor.nombre}</b>
                {ultimoDelMuro.gooal ? ' ha conseguido ' : ' ha publicado algo'}
                {ultimoDelMuro.gooal && (
                  <b style={{ fontWeight: 650, color: MARCA.aurora }}>{ultimoDelMuro.gooal.titulo}</b>
                )}
              </span>
              <ChevronRight aria-hidden style={{ marginLeft: 'auto', flexShrink: 0, width: 16, height: 16, color: SUPERFICIE.apagado }} />
            </Link>
          )}
        </div>
      </AppShell>

      {/* ── Modales ──────────────────────────────────────── */}
      {ficha && (
        <GooalV2DetailModal
          gooal={ficha}
          estado={misEstados[ficha.id]}
          onClose={() => setFicha(null)}
          onCambio={() => cargar(true)}
          onCompletado={setCelebracion}
        />
      )}

      {celebracion && (
        <CelebracionPuntos resultado={celebracion} onClose={() => setCelebracion(null)} />
      )}

      {lista && (
        <ListaUsuariosModal
          userId={profile.id}
          tipo={lista}
          cuantos={{ seguidores: resumen.seguidores, siguiendo: resumen.siguiendo }}
          onClose={() => setLista(null)}
          onUsuarioClick={username => { setLista(null); if (username) router.push(`/perfil?u=${username}`) }}
        />
      )}

      {buscando && (
        <BuscarUsuariosSheet
          onClose={() => setBuscando(false)}
          onUsuarioClick={username => { setBuscando(false); if (username) router.push(`/perfil?u=${username}`) }}
        />
      )}

      {ajustes && (
        <AjustesSheet
          perfil={ajustes}
          onClose={() => setAjustes(null)}
          onEditar={() => { setAjustes(null); setEditando(true) }}
          onInvitar={() => { setAjustes(null); setInvitando(true) }}
          onCerrarSesion={handleLogout}
        />
      )}

      {editando && (
        <EditarPerfilModal
          userId={profile.id}
          nombreActual={profile.nombre}
          fotoActual={profile.foto_perfil_url}
          onClose={() => setEditando(false)}
          onGuardado={cambios => {
            setProfile(p => p && ({ ...p, ...cambios }))
            setEditando(false)
          }}
        />
      )}

      {invitando && <InvitarAmigoSheet onClose={() => setInvitando(false)} />}
    </>
  )
}

