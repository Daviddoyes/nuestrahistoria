'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Check, Camera, MapPin } from 'lucide-react'
import { anadirGooal, getDetalleGooal } from '@/lib/actions'
import {
  CATEGORIA_COLOR, CATEGORIA_LABEL, CATEGORIA_GRADIENTE, DIFICULTAD_META,
} from '@/lib/gooals'
import Avatar from './Avatar'
import CompletarGooalModal, { type ResultadoCompletado } from './CompletarGooalModal'
import type { GooalV2, UsuarioMini, EstadoUserGooal } from '@/types/gooals'

type Props = {
  gooal: GooalV2
  /** Estado del gooal para el usuario actual; undefined si no lo tiene. */
  estado?: EstadoUserGooal
  onClose: () => void
  /** Se llama tras añadir o completar, para refrescar el catálogo. */
  onCambio: () => void
  onCompletado: (resultado: ResultadoCompletado) => void
}

export default function GooalV2DetailModal({
  gooal, estado, onClose, onCambio, onCompletado,
}: Props) {
  const [cerrando, setCerrando] = useState(false)
  const [anadiendo, setAnadiendo] = useState(false)
  const [estadoLocal, setEstadoLocal] = useState<EstadoUserGooal | undefined>(estado)
  const [error, setError] = useState('')
  const [vecesCompletado, setVecesCompletado] = useState(gooal.veces_completado)
  const [ultimos, setUltimos] = useState<UsuarioMini[]>([])
  const [completando, setCompletando] = useState<'lista' | 'directo' | null>(null)

  const color = CATEGORIA_COLOR[gooal.categoria]
  const dificultad = DIFICULTAD_META[gooal.dificultad]

  const cerrar = () => {
    if (cerrando) return
    setCerrando(true)
    setTimeout(onClose, 260)
  }

  useEffect(() => {
    let vivo = true
    getDetalleGooal(gooal.id)
      .then(d => {
        if (!vivo) return
        setVecesCompletado(d.vecesCompletado)
        setUltimos(d.ultimos)
      })
      .catch(e => console.error('[GooalV2DetailModal]', e))
    return () => { vivo = false }
  }, [gooal.id])

  const handleAnadir = async () => {
    setAnadiendo(true)
    setError('')
    const res = await anadirGooal(gooal.id)
    if (res.success) {
      setEstadoLocal('pendiente')
      onCambio()
    } else {
      setError(res.error ?? 'No se pudo añadir el gooal.')
    }
    setAnadiendo(false)
  }

  const handleCompletado = (resultado: ResultadoCompletado) => {
    setCompletando(null)
    setEstadoLocal('completado')
    onCambio()
    onCompletado(resultado)
    cerrar()
  }

  const lugar = [gooal.ciudad, gooal.pais].filter(Boolean).join(', ')

  return (
    <>
      <button
        onClick={cerrar}
        aria-label="Cerrar"
        className="fixed right-4 z-[70] w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white/70 active:bg-black/70 active:text-white transition-colors"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <X className="w-4 h-4" />
      </button>

      <div className={`fixed inset-0 z-[60] bg-[#0B0B0B] overflow-y-auto ${cerrando ? 'modal-slide-down' : 'modal-slide-up'}`}>
        {/* Imagen de cabecera */}
        <div
          style={{
            position: 'relative', width: '100%', aspectRatio: '4/3',
            background: gooal.imagen_url ? '#161817' : CATEGORIA_GRADIENTE[gooal.categoria],
          }}
        >
          {gooal.imagen_url && (
            <img
              src={gooal.imagen_url}
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 40%, #0B0B0B 100%)',
            }}
          />
        </div>

        <div
          className="px-6"
          style={{ marginTop: -32, paddingBottom: 'max(3rem, env(safe-area-inset-bottom, 0px))' }}
        >
          <h2 className="fuente-titular" style={{ fontSize: 24, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2 }}>
            {gooal.titulo}
          </h2>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            <span style={{
              fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
              color, background: `${color}22`, borderRadius: 999, padding: '5px 11px',
            }}>
              {CATEGORIA_LABEL[gooal.categoria]}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600, color: dificultad.color,
              background: `${dificultad.color}1F`, borderRadius: 999, padding: '5px 11px',
            }}>
              {dificultad.emoji} {dificultad.label}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#00D1A7',
              background: 'rgba(0,209,167,0.14)', borderRadius: 999, padding: '5px 11px',
            }}>
              +{gooal.puntos} pts
            </span>
          </div>

          {lugar && (
            <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#7A8A85', marginTop: 12 }}>
              <MapPin className="w-3.5 h-3.5" style={{ color: '#00D1A7' }} />
              {lugar}
            </p>
          )}

          {gooal.descripcion && (
            <p style={{ fontSize: 14, color: '#A3B1AC', lineHeight: 1.65, marginTop: 16 }}>
              {gooal.descripcion}
            </p>
          )}

          <p style={{ fontSize: 13, color: '#7A8A85', marginTop: 20 }}>
            <span style={{ color: '#00D1A7', fontWeight: 700 }}>{vecesCompletado}</span>{' '}
            {vecesCompletado === 1 ? 'persona lo logró' : 'personas lo lograron'}
          </p>

          {ultimos.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 12 }}>
              {ultimos.map((u, i) => (
                <div key={u.id} style={{ marginLeft: i === 0 ? 0 : -10, zIndex: ultimos.length - i }}>
                  <Avatar nombre={u.nombre} foto={u.foto_perfil_url} size={34} borde="#0B0B0B" />
                </div>
              ))}
            </div>
          )}

          {/* Acciones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 28 }}>
            {estadoLocal === 'completado' ? (
              <div
                className="w-full py-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: 'rgba(0,209,167,0.14)', color: '#00D1A7' }}
              >
                <Check className="w-4 h-4" /> Ya lo conseguiste
              </div>
            ) : estadoLocal === 'pendiente' ? (
              <button
                onClick={() => setCompletando('lista')}
                className="w-full py-4 bg-[#00D1A7] active:bg-[#00B893] text-[#0B0B0B] rounded-xl text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2 transition-colors"
              >
                <Camera className="w-4 h-4" /> Completar ahora
              </button>
            ) : (
              <>
                <button
                  onClick={handleAnadir}
                  disabled={anadiendo}
                  className="w-full py-4 bg-[#00D1A7] active:bg-[#00B893] disabled:opacity-60 text-[#0B0B0B] rounded-xl text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2 transition-colors"
                >
                  {anadiendo
                    ? <span className="w-4 h-4 border-2 border-[#0B0B0B] border-t-transparent rounded-full animate-spin" />
                    : <Plus className="w-4 h-4" />
                  }
                  {anadiendo ? 'Añadiendo...' : 'Añadir a mi lista'}
                </button>

                <button
                  onClick={() => setCompletando('directo')}
                  className="w-full py-4 rounded-xl text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2 border border-[#2A2E2C] text-[#FFFFFF] active:bg-[#1E2120] transition-colors"
                >
                  <Camera className="w-4 h-4" /> Ya lo hice — subir prueba
                </button>
              </>
            )}
          </div>

          {error && <p style={{ color: '#FF5252', fontSize: 13, marginTop: 12 }}>{error}</p>}
        </div>
      </div>

      {completando && (
        <CompletarGooalModal
          gooal={gooal}
          modo={completando}
          onClose={() => setCompletando(null)}
          onCompletado={handleCompletado}
        />
      )}
    </>
  )
}
