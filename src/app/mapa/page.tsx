'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { getMyProfile, getMisEstadosGooals, getGooalV2 } from '@/lib/actions'
import { CATEGORIAS, CATEGORIA_LABEL, type CategoriaGooal } from '@/lib/gooals'
import AppShell, { PantallaCargando } from '@/components/AppShell'
import ChipCategoria from '@/components/ChipCategoria'
import GooalV2DetailModal from '@/components/GooalV2DetailModal'
import CelebracionPuntos from '@/components/CelebracionPuntos'
import type { ResultadoCompletado } from '@/components/CompletarGooalModal'
import type { EstadoUserGooal, GooalV2, Profile } from '@/types/gooals'

/**
 * Leaflet toca `window` nada más cargarse, así que no puede renderizarse en el
 * servidor: con SSR el build revienta. Se carga solo en el navegador.
 */
const MapaGooals = dynamic(() => import('@/components/MapaGooals'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="w-5 h-5 border-2 border-[#2A2E2C] border-t-[#00D1A7] rounded-full animate-spin" />
    </div>
  ),
})

/** Cuánto esperamos a que el navegador resuelva la ubicación antes de rendirnos. */
const ESPERA_UBICACION = 5000

export default function MapaPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const [categoria, setCategoria] = useState<CategoriaGooal | 'todos'>('todos')
  const [misEstados, setMisEstados] = useState<Record<string, EstadoUserGooal>>({})
  const [posicion, setPosicion] = useState<{ lat: number; lng: number } | null>(null)
  const [seleccionado, setSeleccionado] = useState<GooalV2 | null>(null)
  const [celebracion, setCelebracion] = useState<ResultadoCompletado | null>(null)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    getMyProfile()
      .then(prof => {
        if (!prof) { router.push('/'); return }
        setProfile(prof)
      })
      .catch(e => console.error('[mapa]', e))
      .finally(() => setLoading(false))
  }, [router])

  const cargarEstados = useCallback(() => {
    getMisEstadosGooals()
      .then(setMisEstados)
      .catch(e => console.error('[mapa:estados]', e))
  }, [])

  useEffect(() => { cargarEstados() }, [cargarEstados])

  // Aquí sí se pide la ubicación al entrar: esta pantalla ES el mapa. No se
  // espera por ella — arranca en Europa y vuela a la ciudad si llega a tiempo.
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => setPosicion({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => console.warn('[mapa] sin ubicación:', err.message),
      { timeout: ESPERA_UBICACION, maximumAge: 5 * 60 * 1000 },
    )
  }, [])

  // Memorizados: sin esto el mapa volvería a pedir los pines en cada rerender.
  const filtros = useMemo(() => ({ categoria, dificultad: null, busqueda: '' }), [categoria])

  // El pin solo trae unas pocas columnas; la ficha necesita la fila entera.
  const abrirGooal = useCallback(async (id: string) => {
    setAviso('')
    try {
      const g = await getGooalV2(id)
      if (g) setSeleccionado(g)
      else setAviso('Este gooal ya no está disponible.')
    } catch (e) {
      console.error('[mapa:ficha]', e)
      setAviso('No hemos podido abrir este gooal. Inténtalo de nuevo.')
    }
  }, [])

  if (loading) return <PantallaCargando />
  if (!profile) return null

  const filtrosCategoria = (
    <div
      className="flex gap-2 overflow-x-auto"
      style={{ scrollbarWidth: 'none', padding: '4px 12px 10px' }}
    >
      <ChipCategoria activo={categoria === 'todos'} onClick={() => setCategoria('todos')}>
        Todos
      </ChipCategoria>
      {CATEGORIAS.map(c => (
        <ChipCategoria key={c} activo={categoria === c} onClick={() => setCategoria(c)}>
          {CATEGORIA_LABEL[c]}
        </ChipCategoria>
      ))}
    </div>
  )

  return (
    <>
      <AppShell tab="mapa" fotoPerfil={profile.foto_perfil_url} header={filtrosCategoria}>
        {/*
          height 100%: el área de contenido de AppShell tiene altura fija, y Leaflet
          necesita una altura concreta o se queda a cero píxeles.
          isolation: Leaflet pone sus capas y botones con z-index de hasta 1.000;
          sin aislarlo, el zoom y los globos se pintarían encima del detalle del gooal.
        */}
        <div style={{ position: 'relative', height: '100%', isolation: 'isolate' }}>
          <MapaGooals
            filtros={filtros}
            estados={misEstados}
            posicion={posicion}
            onSeleccionar={abrirGooal}
          />

          {aviso && (
            <p
              role="alert"
              className="text-sm text-[#FF5252] bg-[#161817] border border-[rgba(255,82,82,0.35)] px-3 py-2 rounded-lg"
              style={{ position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 1000 }}
            >
              {aviso}
            </p>
          )}
        </div>
      </AppShell>

      {seleccionado && (
        <GooalV2DetailModal
          gooal={seleccionado}
          estado={misEstados[seleccionado.id]}
          onClose={() => setSeleccionado(null)}
          onCambio={cargarEstados}
          onCompletado={setCelebracion}
        />
      )}

      {celebracion && (
        <CelebracionPuntos resultado={celebracion} onClose={() => setCelebracion(null)} />
      )}
    </>
  )
}
