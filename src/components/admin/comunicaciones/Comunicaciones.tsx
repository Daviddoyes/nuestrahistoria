'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Send } from 'lucide-react'
import {
  GRUPOS, LIMITES, htmlCorreo, mismoContenido, nombreGrupo, validarContenido,
  type ContenidoCorreo, type GrupoCorreo,
} from '@/lib/email-plantilla'
import type { CampanaAnterior, CampanaHistorial, RecuentoGrupo } from '@/lib/comunicaciones'
import { enviarCampana, enviarPrueba, recuentoDeGrupos } from '@/app/admin/comunicaciones/acciones'
import DialogoEnviar from './DialogoEnviar'
import Historial from './Historial'
import { recuentoTexto, resumenEnvio } from './textos'

type Props = {
  historial: { campanas: CampanaHistorial[]; anteriores: CampanaAnterior[] }
  grupos: RecuentoGrupo[]
  /** Si hay clave de Resend en el servidor. Sin ella no se puede ni probar. */
  configurado: boolean
}

const etiqueta: React.CSSProperties = { display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#7A8A85', marginBottom: 7 }
const campo: React.CSSProperties = { width: '100%', padding: '11px 12px', borderRadius: 10, border: '1px solid #2A2E2C', background: '#0B0B0B', color: '#FFFFFF', fontSize: 15 }
const tituloSeccion: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#7A8A85', marginBottom: 12 }

/**
 * Pestaña Comunicaciones. El freno de mano, de fuera a dentro:
 *   1. vista previa en la pantalla;
 *   2. prueba a tu propia cuenta;
 *   3. el botón de enviar solo se activa con el texto EXACTO de la última prueba;
 *   4. diálogo con el grupo y la cifra, en el que hay que escribir ENVIAR;
 *   5. el servidor repite todas estas comprobaciones y no deja enviar dos veces.
 */
export default function Comunicaciones({ historial, grupos: gruposIniciales, configurado }: Props) {
  const router = useRouter()
  const [contenido, setContenido] = useState<ContenidoCorreo>({ asunto: '', cuerpo: '', botonTexto: '', botonUrl: '' })
  const [conBoton, setConBoton] = useState(false)
  const [grupo, setGrupo] = useState<GrupoCorreo>('todos')
  const [grupos, setGrupos] = useState(gruposIniciales)

  const [campanaId, setCampanaId] = useState<string | null>(null)
  const [probado, setProbado] = useState<{ contenido: ContenidoCorreo; a: string; hora: string } | null>(null)
  const [probando, setProbando] = useState(false)
  const [avisoPrueba, setAvisoPrueba] = useState<{ bien: boolean; texto: string } | null>(null)

  const [dialogo, setDialogo] = useState<{ personas: number | null; error: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<{ bien: boolean; texto: string } | null>(null)

  // Sin botón, sus campos no cuentan aunque se hubiera escrito algo antes.
  const efectivo = useMemo<ContenidoCorreo>(
    () => (conBoton ? contenido : { ...contenido, botonTexto: '', botonUrl: '' }),
    [contenido, conBoton],
  )
  const errores = validarContenido(efectivo)
  const vacio = !efectivo.asunto.trim() && !efectivo.cuerpo.trim()
  const vistaPrevia = useMemo(() => htmlCorreo(efectivo, { enlaceBaja: '#' }), [efectivo])

  const pruebaVigente = Boolean(probado && campanaId && mismoContenido(probado.contenido, efectivo))
  const recuento = grupos.find(g => g.grupo === grupo)
  const puedeAbrirEnvio = configurado && pruebaVigente && errores.length === 0 && !enviando

  const cambiar = (cambio: Partial<ContenidoCorreo>) => {
    setContenido(c => ({ ...c, ...cambio }))
    setResultado(null)
  }

  const mandarPrueba = async () => {
    setProbando(true)
    setAvisoPrueba(null)
    try {
      const r = await enviarPrueba({ contenido: efectivo, campanaId })
      if (!r.ok) { setAvisoPrueba({ bien: false, texto: r.error }); return }
      setCampanaId(r.campanaId)
      setProbado({ contenido: r.probado, a: r.a, hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) })
      setAvisoPrueba({ bien: true, texto: `Prueba enviada a ${r.a}. Ábrela en tu correo y revísala antes de enviar.` })
      router.refresh()
    } catch {
      setAvisoPrueba({ bien: false, texto: 'No se pudo mandar la prueba. Revisa la conexión.' })
    } finally {
      setProbando(false)
    }
  }

  // Al abrir el diálogo se vuelve a contar: la cifra que se confirma es la de ahora, no la de cuando se cargó la página.
  const abrirEnvio = async () => {
    setDialogo({ personas: null, error: '' })
    try {
      const r = await recuentoDeGrupos()
      if (!r.ok) { setDialogo({ personas: 0, error: r.error }); return }
      setGrupos(r.grupos)
      setDialogo({ personas: r.grupos.find(g => g.grupo === grupo)?.destinatarios ?? 0, error: '' })
    } catch {
      setDialogo({ personas: 0, error: 'No se pudo contar a los destinatarios. Cierra e inténtalo de nuevo.' })
    }
  }

  const confirmarEnvio = async (texto: string) => {
    if (!dialogo?.personas || !campanaId) return
    setEnviando(true)
    try {
      const r = await enviarCampana({ campanaId, contenido: efectivo, grupo, esperados: dialogo.personas, confirmacion: texto })
      if (!r.ok) {
        setDialogo(d => (d ? { ...d, error: r.error } : d))
        return
      }
      setResultado(resumenEnvio(r))
      setDialogo(null)
      // Enviada o cortada, esta campaña ya no es un borrador: se empieza en limpio.
      setContenido({ asunto: '', cuerpo: '', botonTexto: '', botonUrl: '' })
      setConBoton(false)
      setCampanaId(null)
      setProbado(null)
      setAvisoPrueba(null)
      router.refresh()
    } catch {
      // Sin respuesta no se sabe hasta dónde llegó: el historial lo dirá.
      setDialogo(null)
      setResultado({ bien: false, texto: 'Se perdió la conexión durante el envío. Recarga la página y mira el historial: si se cortó, podrás reanudarlo sin repetir a nadie.' })
      router.refresh()
    } finally {
      setEnviando(false)
    }
  }

  const porQueNoSeEnvia = !configurado
    ? 'Falta la clave de Resend en el servidor.'
    : errores.length > 0 || vacio
      ? 'Completa el correo y mándate una prueba.'
      : !probado
        ? 'Primero mándate una prueba de este texto.'
        : !pruebaVigente
          ? 'Has cambiado el texto desde la última prueba: mándate otra.'
          : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {!configurado && (
        <p role="alert" style={{ display: 'flex', gap: 8, fontSize: 13, color: '#FF5252', background: 'rgba(255,82,82,0.12)', borderRadius: 10, padding: '10px 12px' }}>
          <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} /> Falta RESEND_API_KEY en el servidor: no se puede enviar ni probar.
        </p>
      )}

      {resultado && (
        <p role="status" style={{ fontSize: 14, lineHeight: 1.6, borderRadius: 12, padding: '12px 14px', color: resultado.bien ? '#00D1A7' : '#FF5252', background: resultado.bien ? 'rgba(0,209,167,0.1)' : 'rgba(255,82,82,0.12)' }}>
          {resultado.texto}
        </p>
      )}

      <section>
        <p style={tituloSeccion}>Nuevo correo</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'start' }}>
          {/* ── Escribir ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label htmlFor="correo-asunto" style={etiqueta}>Asunto</label>
              <input id="correo-asunto" value={contenido.asunto} maxLength={LIMITES.asunto} onChange={e => cambiar({ asunto: e.target.value })} style={campo} placeholder="Novedades en GooALS" />
            </div>

            <div>
              <label htmlFor="correo-cuerpo" style={etiqueta}>Texto</label>
              <textarea id="correo-cuerpo" value={contenido.cuerpo} maxLength={LIMITES.cuerpo} onChange={e => cambiar({ cuerpo: e.target.value })} rows={10}
                style={{ ...campo, resize: 'vertical', lineHeight: 1.6 }}
                placeholder={'Hola:\n\nDeja una línea en blanco entre párrafo y párrafo.\n\nUn abrazo,\nDavid'} />
              <p style={{ fontSize: 12, color: '#7A8A85', marginTop: 5 }}>Una línea en blanco separa los párrafos. Sin formato: se escribe tal cual.</p>
            </div>

            <div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#FFFFFF', minHeight: 40, cursor: 'pointer' }}>
                <input type="checkbox" checked={conBoton} onChange={e => { setConBoton(e.target.checked); setResultado(null) }} style={{ width: 18, height: 18, accentColor: '#00D1A7' }} />
                Añadir un botón
              </label>
              {conBoton && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginTop: 8 }}>
                  <div>
                    <label htmlFor="correo-boton-texto" style={etiqueta}>Texto del botón</label>
                    <input id="correo-boton-texto" value={contenido.botonTexto} maxLength={LIMITES.botonTexto} onChange={e => cambiar({ botonTexto: e.target.value })} style={campo} placeholder="Abrir GooALS" />
                  </div>
                  <div>
                    <label htmlFor="correo-boton-url" style={etiqueta}>Enlace</label>
                    <input id="correo-boton-url" type="url" inputMode="url" value={contenido.botonUrl} maxLength={LIMITES.botonUrl} onChange={e => cambiar({ botonUrl: e.target.value })} style={campo} placeholder="https://gooals.app" />
                  </div>
                </div>
              )}
            </div>

            {!vacio && errores.length > 0 && (
              <ul style={{ fontSize: 13, color: '#FFD54F', background: 'rgba(255,213,79,0.1)', borderRadius: 10, padding: '10px 12px 10px 28px', lineHeight: 1.6 }}>
                {errores.map(e => <li key={e}>{e}</li>)}
              </ul>
            )}

            <div>
              <p style={etiqueta}>A quién</p>
              <div role="radiogroup" aria-label="Grupo" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {GRUPOS.map(g => {
                  const r = grupos.find(x => x.grupo === g.id)
                  const activo = grupo === g.id
                  return (
                    <label key={g.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${activo ? '#00D1A7' : '#2A2E2C'}`, background: activo ? 'rgba(0,209,167,0.08)' : 'transparent' }}>
                      <input type="radio" name="grupo" checked={activo} onChange={() => setGrupo(g.id)} style={{ marginTop: 3, accentColor: '#00D1A7' }} />
                      <span style={{ fontSize: 13, lineHeight: 1.5 }}>
                        <strong style={{ color: '#FFFFFF' }}>{g.nombre}</strong> <span style={{ color: '#7A8A85' }}>· {g.descripcion}</span>
                        <br /><span style={{ color: '#A3B1AC' }}>{r ? recuentoTexto(r) : '—'}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button type="button" onClick={mandarPrueba} disabled={!configurado || vacio || errores.length > 0 || probando || enviando}
                style={{ minHeight: 44, borderRadius: 10, border: '1px solid #00D1A7', background: 'transparent', color: '#00D1A7', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: !configurado || vacio || errores.length > 0 ? 0.4 : 1 }}>
                {probando ? <span className="w-4 h-4 border-2 border-[#00D1A7] border-t-transparent rounded-full animate-spin" /> : <Send style={{ width: 15, height: 15 }} />}
                {probando ? 'Mandando la prueba…' : 'Enviarme una prueba'}
              </button>
              {avisoPrueba && (
                <p role="status" style={{ fontSize: 13, lineHeight: 1.5, color: avisoPrueba.bien ? '#00D1A7' : '#FF5252' }}>{avisoPrueba.texto}</p>
              )}
              {probado && !pruebaVigente && (
                <p style={{ fontSize: 13, color: '#FFD54F' }}>La última prueba ({probado.hora}) era de otro texto.</p>
              )}

              <button type="button" onClick={abrirEnvio} disabled={!puedeAbrirEnvio}
                style={{ minHeight: 48, borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 700,
                  background: puedeAbrirEnvio ? '#FF5252' : '#2A2E2C', color: puedeAbrirEnvio ? '#0B0B0B' : '#7A8A85', cursor: puedeAbrirEnvio ? 'pointer' : 'not-allowed' }}>
                Enviar a {nombreGrupo(grupo)}{recuento ? ` (${recuento.destinatarios.toLocaleString('es-ES')})` : ''}…
              </button>
              {porQueNoSeEnvia && <p style={{ fontSize: 12, color: '#7A8A85' }}>{porQueNoSeEnvia}</p>}
            </div>
          </div>

          {/* ── Vista previa ── */}
          <div>
            <p style={etiqueta}>Vista previa</p>
            {vacio ? (
              <div style={{ minHeight: 320, borderRadius: 12, border: '1px dashed #2A2E2C', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontSize: 13, color: '#7A8A85' }}>
                Escribe el asunto y el texto: aquí verás el correo tal como llegará.
              </div>
            ) : (
              <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #2A2E2C' }}>
                <div style={{ background: '#1E2120', padding: '10px 12px', fontSize: 13 }}>
                  <p style={{ color: '#7A8A85' }}>Asunto</p>
                  <p style={{ color: '#FFFFFF', fontWeight: 600, marginTop: 2 }}>{efectivo.asunto.trim() || '(sin asunto)'}</p>
                </div>
                {/* sandbox vacío: sin scripts ni enlaces que se abran desde la vista previa. */}
                <iframe title="Vista previa del correo" srcDoc={vistaPrevia} sandbox="" style={{ display: 'block', width: '100%', height: 560, border: 'none', background: '#F5F5F2' }} />
              </div>
            )}
          </div>
        </div>
      </section>

      <Historial campanas={historial.campanas} anteriores={historial.anteriores} configurado={configurado} />

      {dialogo && (
        <DialogoEnviar
          titulo="Enviar de verdad"
          personas={dialogo.personas}
          ocupado={enviando}
          error={dialogo.error}
          onConfirmar={confirmarEnvio}
          onCancelar={() => setDialogo(null)}
        >
          {dialogo.personas === null ? (
            <p>Contando destinatarios…</p>
          ) : (
            <>
              <p>
                Vas a enviar <strong style={{ color: '#FFFFFF' }}>«{efectivo.asunto.trim()}»</strong> al grupo{' '}
                <strong style={{ color: '#FFFFFF' }}>{nombreGrupo(grupo)}</strong>:{' '}
                <strong style={{ color: '#FF5252', fontSize: 16 }}>{dialogo.personas.toLocaleString('es-ES')} {dialogo.personas === 1 ? 'persona' : 'personas'}</strong>.
              </p>
              {recuento && recuento.excluidos > 0 && <p style={{ marginTop: 6 }}>{recuento.excluidos} más quedan fuera porque se dieron de baja.</p>}
              <p style={{ marginTop: 6 }}>Los correos no se pueden recuperar una vez enviados.</p>
            </>
          )}
        </DialogoEnviar>
      )}
    </div>
  )
}
