'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Check, Camera, MapPin, Trash2, MessageCircle } from 'lucide-react'
import { anadirGooal, conseguirSinFoto, quitarGooal, getDetalleGooal } from '@/lib/actions'
import {
  CATEGORIA_COLOR, CATEGORIA_LABEL, CATEGORIA_GRADIENTE, DIFICULTAD_META,
} from '@/lib/gooals'
import Avatar from './Avatar'
import Confirmacion from './Confirmacion'
import PostDetailModal from './PostDetailModal'
import AnadirFotoModal, { type ResultadoCompletado } from './AnadirFotoModal'
import { ProveedorFotosPrivadas, useFotoPrivada } from './FotosPrivadas'
import type { GooalV2, UsuarioMini, EstadoUserGooal } from '@/types/gooals'

type Props = {
  gooal: GooalV2
  /** Estado del gooal para el usuario actual; undefined si no lo tiene. */
  estado?: EstadoUserGooal
  /**
   * La fila de una persona concreta, cuando la ficha se abre desde un perfil Y
   * esa persona guardó su propia foto Y quien mira puede verla. Entonces la
   * cabecera enseña ESA foto; si no, la del catálogo.
   *
   * Es el único sitio de todo el perfil donde se firma una dirección: la lista
   * son títulos y no firma ninguna. Aquí se firma UNA, la que se va a ver.
   */
  logro?: string | null
  onClose: () => void
  /** Se llama tras añadir o completar, para refrescar el catálogo. */
  onCambio: () => void
  onCompletado: (resultado: ResultadoCompletado) => void
}

export default function GooalV2DetailModal({
  gooal, estado, logro, onClose, onCambio, onCompletado,
}: Props) {
  const [cerrando, setCerrando] = useState(false)
  const [anadiendo, setAnadiendo] = useState(false)
  const [estadoLocal, setEstadoLocal] = useState<EstadoUserGooal | undefined>(estado)
  const [error, setError] = useState('')
  const [vecesConseguido, setVecesConseguido] = useState(gooal.veces_completado)
  const [ultimos, setUltimos] = useState<UsuarioMini[]>([])
  const [anadiendoFoto, setAnadiendoFoto] = useState(false)
  // El texto de la barra verde de confirmación, o null si no hay nada que
  // confirmar. Sirve para añadir y para quitar: el aviso es el mismo.
  const [confirmacion, setConfirmacion] = useState<string | null>(null)
  const [quitando, setQuitando] = useState(false)
  const [preguntandoQuitar, setPreguntandoQuitar] = useState(false)
  const [tieneFoto, setTieneFoto] = useState(false)
  // El post del muro de quien mira, para poder volver a sus comentarios.
  const [miPostId, setMiPostId] = useState<string | null>(null)
  const [postAbierto, setPostAbierto] = useState(false)
  const [marcando, setMarcando] = useState(false)
  // Tras marcarlo se ofrece la foto. Es una invitación, no un paso: mientras
  // está puesta, la ficha NO se cierra sola, porque ofrecer algo y quitarlo de
  // en medio es peor que no ofrecerlo.
  const [invitandoFoto, setInvitandoFoto] = useState(false)

  // Fuera de <ProveedorFotosPrivadas> (Explorar, el mapa) esto no pide nada y
  // devuelve null, así que la cabecera se queda con la foto del catálogo.
  const { foto, video, refrescar } = useFotoPrivada(logro)
  const reintentado = useRef(false)
  // Un solo reintento (la dirección firmada pudo caducar). Si la segunda
  // tampoco carga, el fichero no está: se cae a la foto del catálogo en vez de
  // dejar el icono de imagen rota, que no le dice nada a nadie.
  const [fotoRota, setFotoRota] = useState(false)
  useEffect(() => { reintentado.current = false; setFotoRota(false) }, [foto, video])
  const alFallarLaFoto = () => {
    if (reintentado.current) { setFotoRota(true); return }
    reintentado.current = true
    refrescar()
  }
  const fotoPropia = fotoRota ? null : foto
  const videoPropio = fotoRota ? null : video

  const color = CATEGORIA_COLOR[gooal.categoria]
  const dificultad = DIFICULTAD_META[gooal.dificultad]

  const router = useRouter()

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
        setVecesConseguido(d.vecesConseguido)
        setTieneFoto(d.tieneFoto)
        setMiPostId(d.miPostId)
        setUltimos(d.ultimos)
      })
      .catch(e => console.error('[GooalV2DetailModal]', e))
    return () => { vivo = false }
  }, [gooal.id])

  // Antes, al añadir, solo cambiaba el texto de un botón: la ficha se quedaba
  // igual y parecía que no había pasado nada. Ahora se ve la confirmación y la
  // ficha se cierra sola, que es la señal de que la acción terminó.
  useEffect(() => {
    if (!confirmacion || invitandoFoto) return
    const t = setTimeout(cerrar, 1500)
    return () => clearTimeout(t)
    // cerrar no va en la lista a propósito: se rehace en cada pintada y
    // reiniciaría el temporizador sin parar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmacion, invitandoFoto])

  const handleAnadir = async () => {
    setAnadiendo(true)
    setError('')
    const res = await anadirGooal(gooal.id)
    if (res.success) {
      setEstadoLocal('pendiente')
      setConfirmacion('Añadido a tus pendientes')
      onCambio()
    } else {
      setError(res.error ?? 'No se pudo añadir el gooal.')
    }
    setAnadiendo(false)
  }

  // "Ya lo hice": el único camino para marcar algo. Da los puntos del gooal y
  // la foto se ofrece después, cuando ya están dados. La foto nunca probó nada;
  // es el recuerdo, y un recuerdo no se pide por adelantado.
  const handleYaLoHice = async () => {
    setMarcando(true)
    setError('')
    const res = await conseguirSinFoto(gooal.id)
    if (res.success) {
      setEstadoLocal('completado')
      setTieneFoto(false)
      setInvitandoFoto(true)
      setConfirmacion(`¡Conseguido! +${res.puntosGanados ?? gooal.puntos} pts`)
      onCambio()
      // La celebración se pone encima (z-80) y la ficha se queda debajo con la
      // invitación a la foto puesta: al cerrarla, está ahí esperando.
      onCompletado({
        puntosGanados: res.puntosGanados ?? gooal.puntos,
        puntosTotales: res.puntosTotales ?? 0,
        nivel: res.nivel ?? 'Principiante',
        subioDeNivel: Boolean(res.subioDeNivel),
      })
    } else {
      setError(res.error ?? 'No se pudo guardar el gooal.')
    }
    setMarcando(false)
  }

  const handleQuitar = async () => {
    setQuitando(true)
    setError('')
    const res = await quitarGooal(gooal.id)
    if (res.success) {
      setPreguntandoQuitar(false)
      setEstadoLocal(undefined)
      setConfirmacion('Quitado de tus pendientes')
      onCambio()
    } else {
      setPreguntandoQuitar(false)
      setError('No se pudo quitar el gooal.')
    }
    setQuitando(false)
  }

  /**
   * Vuelve de añadir la foto. NO se celebra: los puntos ya estaban dados al
   * marcarlo, y `completarGooal` devuelve los del gooal, no los que acabas de
   * ganar. Celebrar aquí diría "+6 puntos ganados" cuando has ganado cero.
   */
  const handleFotoGuardada = () => {
    setAnadiendoFoto(false)
    setEstadoLocal('completado')
    setTieneFoto(true)
    setInvitandoFoto(false)
    setConfirmacion('Foto guardada')
    onCambio()
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
        {/*
          Columna de al menos una pantalla: la cabecera crece para ocupar lo que
          sobra y el contenido queda pegado abajo, junto al pulgar. Antes la
          cabecera tenía alto fijo y debajo de los botones quedaba media pantalla
          vacía.
        */}
        <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              position: 'relative', width: '100%', flex: '1 0 auto',
              // El alto de la antigua proporción 4/3, como mínimo, sin pasar de 360 px.
              minHeight: 'min(75vw, 360px)',
              background: fotoPropia || videoPropio || gooal.imagen_url ? '#161817' : CATEGORIA_GRADIENTE[gooal.categoria],
            }}
          >
            {/* Primero la foto de esa persona, si la hay y se puede ver; si no,
                la del catálogo; si tampoco, el degradado de su categoría. */}
            {videoPropio ? (
              <video
                src={videoPropio}
                controls
                playsInline
                onError={alFallarLaFoto}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', background: '#000' }}
              />
            ) : fotoPropia ? (
              // eslint-disable-next-line @next/next/no-img-element -- dirección firmada que caduca
              <img
                src={fotoPropia}
                alt=""
                onError={alFallarLaFoto}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : gooal.imagen_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- imágenes del catálogo de tamaño variable
              <img
                src={gooal.imagen_url}
                alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : null}
            {/* Oscuro arriba para el botón de cerrar, y velo negro abajo para que el título se lea sobre cualquier foto o color. */}
            <div
              style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.82) 100%)',
              }}
            />
            {/*
              El título va DENTRO de la cabecera. Antes iba debajo con marginTop
              negativo para montarse encima, pero la cabecera tiene position:
              relative y eso la pinta por encima de lo que no está posicionado:
              su degradado, que acababa en el color del fondo, tapaba el título.
            */}
            <h2
              className="fuente-titular"
              style={{
                position: 'absolute', left: 24, right: 24, bottom: 18,
                fontSize: 22, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.22,
                textShadow: '0 1px 8px rgba(0,0,0,0.45)',
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              } as React.CSSProperties}
            >
              {gooal.titulo}
            </h2>
          </div>

        <div
          className="px-6"
          style={{ paddingTop: 16, paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))' }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
            <span style={{ color: '#00D1A7', fontWeight: 700 }}>{vecesConseguido}</span>{' '}
            {vecesConseguido === 1 ? 'persona lo ha conseguido' : 'personas lo han conseguido'}
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
            {confirmacion ? (
              <>
                <div
                  role="status"
                  className="w-full py-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: '#00D1A7', color: '#0B0B0B' }}
                >
                  <Check className="w-4 h-4" /> {confirmacion}
                </div>

                {/* La foto se ofrece DESPUÉS de dar los puntos, y como una
                    pregunta. Antes iba delante, dentro del botón, y entonces no
                    era una invitación: era el precio de marcar algo. */}
                {invitandoFoto && (
                  <>
                    <p style={{ fontSize: 14, color: '#A3B1AC', textAlign: 'center', margin: '6px 0 2px' }}>
                      ¿Tienes una foto de aquel día?
                    </p>
                    <button
                      onClick={() => setAnadiendoFoto(true)}
                      className="w-full py-3.5 rounded-xl text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2 border border-[#00D1A7] text-[#00D1A7] active:bg-[rgba(0,209,167,0.14)] transition-colors"
                    >
                      <Camera className="w-4 h-4" /> Añadir una foto
                    </button>
                    <button
                      onClick={cerrar}
                      className="w-full py-3 rounded-xl text-sm font-semibold min-h-[44px] text-[#7A8A85] active:bg-[#1E2120] transition-colors"
                    >
                      Ahora no
                    </button>
                  </>
                )}
              </>
            ) : estadoLocal === 'completado' ? (
              <>
                <div
                  className="w-full py-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: 'rgba(0,209,167,0.14)', color: '#00D1A7' }}
                >
                  <Check className="w-4 h-4" /> Ya lo conseguiste
                </div>

                {miPostId && (
                  <button
                    onClick={() => setPostAbierto(true)}
                    className="w-full py-3 rounded-xl text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2 border border-[#2A2E2C] text-[#FFFFFF] active:bg-[#1E2120] transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" /> Ver en el muro
                  </button>
                )}

                {/* Sin foto, se puede deshacer: un toque equivocado no puede
                    dejarte unos puntos para siempre. Con foto no se ofrece,
                    porque borrarlo se llevaría el recuerdo. */}
                {!tieneFoto && (
                  <>
                    <button
                      onClick={() => setAnadiendoFoto(true)}
                      className="w-full py-3 rounded-xl text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2 border border-[#2A2E2C] text-[#FFFFFF] active:bg-[#1E2120] transition-colors"
                    >
                      <Camera className="w-4 h-4" /> Añadir una foto
                    </button>

                    <button
                      onClick={() => setPreguntandoQuitar(true)}
                      className="w-full py-3 rounded-xl text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2 text-[#7A8A85] active:bg-[#1E2120] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Quitar de mi lista
                    </button>
                  </>
                )}
              </>
            ) : estadoLocal === 'pendiente' ? (
              <>
                {/* Un solo camino para marcarlo. Antes había dos botones, y el
                    de arriba ("Completar ahora") era en realidad "sube una
                    foto": dos formas de conseguir lo mismo, una con peaje. */}
                <BotonYaLoHice onClick={handleYaLoHice} ocupado={marcando} primario />

                {/* Hasta ahora un pendiente no se podía quitar de ninguna manera:
                    quien añadía algo sin querer se lo quedaba para siempre. */}
                <button
                  onClick={() => setPreguntandoQuitar(true)}
                  className="w-full py-3 rounded-xl text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2 text-[#7A8A85] active:bg-[#1E2120] transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Quitar de mi lista
                </button>
              </>
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

                <BotonYaLoHice onClick={handleYaLoHice} ocupado={marcando} />
              </>
            )}
          </div>

          {error && <p style={{ color: '#FF5252', fontSize: 13, marginTop: 12 }}>{error}</p>}
        </div>
        </div>
      </div>

      {preguntandoQuitar && (
        <Confirmacion
          titulo="Quitar de tu lista"
          texto={`«${gooal.titulo}» saldrá de tu lista. Puedes volver a añadirlo cuando quieras.`}
          confirmar="Quitar"
          peligro
          ocupado={quitando}
          onConfirmar={handleQuitar}
          onCancelar={() => setPreguntandoQuitar(false)}
        />
      )}

      {/* Con su propio proveedor: el post enseña una foto privada y hay que
          firmarla. Desde el perfil ya hay uno fuera, pero esta ficha también se
          abre desde Explorar y desde el mapa, donde no lo hay, y allí el post
          saldría sin su foto sin dar ningún error. */}
      {postAbierto && miPostId && (
        <ProveedorFotosPrivadas>
          <PostDetailModal
            postId={miPostId}
            onClose={() => setPostAbierto(false)}
            onAutorClick={u => { if (u) router.push(`/perfil?u=${encodeURIComponent(u)}`) }}
          />
        </ProveedorFotosPrivadas>
      )}

      {anadiendoFoto && (
        <AnadirFotoModal
          gooal={gooal}
          onClose={() => setAnadiendoFoto(false)}
          onCompletado={handleFotoGuardada}
        />
      )}
    </>
  )
}

/**
 * "Ya lo hice". Y nada más: ni "sin foto", ni los puntos en el texto.
 *
 * Los puntos no van en el botón a propósito. Un botón que promete una cifra
 * convierte marcar un recuerdo en cobrar, y además obliga a leerlo antes de
 * decidir. Los puntos salen justo después, cuando ya los tienes.
 *
 * `primario` cuando es la acción principal de la ficha (un pendiente que ya
 * estaba en la lista); en gris cuando convive con "Añadir a mi lista", que es lo
 * que la app prefiere para algo que todavía no has hecho.
 */
function BotonYaLoHice({ onClick, ocupado, primario = false }: { onClick: () => void; ocupado: boolean; primario?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={ocupado}
      className={primario
        ? 'w-full py-4 rounded-xl text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2 bg-[#00D1A7] active:bg-[#00B893] text-[#0B0B0B] disabled:opacity-60 transition-colors'
        : 'w-full py-4 rounded-xl text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2 border border-[#2A2E2C] text-[#A3B1AC] active:bg-[#1E2120] disabled:opacity-60 transition-colors'}
    >
      {ocupado
        ? <span className={`w-4 h-4 border-2 ${primario ? 'border-[#0B0B0B]' : 'border-[#A3B1AC]'} border-t-transparent rounded-full animate-spin`} />
        : <Check className="w-4 h-4" />
      }
      Ya lo hice
    </button>
  )
}
