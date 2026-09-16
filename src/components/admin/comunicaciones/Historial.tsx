'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, RotateCcw, Send } from 'lucide-react'
import { htmlCorreo, nombreGrupo } from '@/lib/email-plantilla'
import type { CampanaAnterior, CampanaHistorial } from '@/lib/comunicaciones'
import { reanudarCampana, reenviarNoConfirmados, resumenReanudar, resumenSinConfirmar } from '@/app/admin/comunicaciones/acciones'
import DialogoEnviar from './DialogoEnviar'
import { resumenEnvio } from './textos'

type Props = { campanas: CampanaHistorial[]; anteriores: CampanaAnterior[]; configurado: boolean }

const fecha = (iso: string) => new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' })

const ESTADO: Record<CampanaHistorial['estado'] | 'parado', { texto: string; color: string }> = {
  borrador: { texto: 'Borrador', color: '#7A8A85' },
  enviando: { texto: 'Enviando', color: '#FFD54F' },
  parado: { texto: 'Cortado', color: '#FF5252' },
  enviado: { texto: 'Enviado', color: '#00D1A7' },
  fallido: { texto: 'Fallido', color: '#FF5252' },
}

function Estado({ clave }: { clave: keyof typeof ESTADO }) {
  const e = ESTADO[clave]
  return <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: e.color, whiteSpace: 'nowrap' }}>{e.texto}</span>
}

/** Las campañas, de la más reciente a la más antigua. Solo números: los emails no salen de la base. */
export default function Historial({ campanas, anteriores, configurado }: Props) {
  const router = useRouter()
  const [abierta, setAbierta] = useState<string | null>(null)
  const [reanudando, setReanudando] = useState<{ id: string; asunto: string; grupo: string; personas: number | null; sinConfirmar: number; error: string } | null>(null)
  const [reenviando, setReenviando] = useState<{ id: string; asunto: string; personas: number | null; posiblesEnviados: number; fallados: number; error: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<{ bien: boolean; texto: string } | null>(null)

  const abrirReanudar = async (c: CampanaHistorial) => {
    setAviso(null)
    setReanudando({ id: c.id, asunto: c.asunto, grupo: c.grupo, personas: null, sinConfirmar: 0, error: '' })
    try {
      const r = await resumenReanudar(c.id)
      setReanudando(d => d && (r.ok ? { ...d, personas: r.nuevos, sinConfirmar: r.sinConfirmar } : { ...d, personas: 0, error: r.error }))
    } catch {
      setReanudando(d => d && { ...d, personas: 0, error: 'No se pudo calcular a quién le falta. Cierra e inténtalo de nuevo.' })
    }
  }

  const confirmarReanudar = async (texto: string) => {
    if (!reanudando || reanudando.personas === null) return
    setOcupado(true)
    try {
      const r = await reanudarCampana({ campanaId: reanudando.id, esperados: reanudando.personas, confirmacion: texto })
      if (!r.ok) { setReanudando(d => d && { ...d, error: r.error }); return }
      setAviso(resumenEnvio(r))
      setReanudando(null)
      router.refresh()
    } catch {
      setReanudando(null)
      setAviso({ bien: false, texto: 'Se perdió la conexión. Recarga la página para ver en qué punto quedó.' })
      router.refresh()
    } finally {
      setOcupado(false)
    }
  }

  // ── Reenviar solo a los que quedaron sin confirmar ──
  const abrirReenvio = async (c: CampanaHistorial) => {
    setAviso(null)
    setReenviando({ id: c.id, asunto: c.asunto, personas: null, posiblesEnviados: 0, fallados: 0, error: '' })
    try {
      const r = await resumenSinConfirmar(c.id)
      setReenviando(d => d && (r.ok
        ? { ...d, personas: r.total, posiblesEnviados: r.posiblesEnviados, fallados: r.fallados }
        : { ...d, personas: 0, error: r.error }))
    } catch {
      setReenviando(d => d && { ...d, personas: 0, error: 'No se pudo calcular quién quedó sin confirmar. Cierra e inténtalo de nuevo.' })
    }
  }

  const confirmarReenvio = async (texto: string) => {
    if (!reenviando || reenviando.personas === null) return
    setOcupado(true)
    try {
      const r = await reenviarNoConfirmados({ campanaId: reenviando.id, esperados: reenviando.personas, confirmacion: texto })
      if (!r.ok) { setReenviando(d => d && { ...d, error: r.error }); return }
      setAviso(resumenEnvio(r))
      setReenviando(null)
      router.refresh()
    } catch {
      setReenviando(null)
      setAviso({ bien: false, texto: 'Se perdió la conexión. Recarga la página para ver en qué punto quedó.' })
      router.refresh()
    } finally {
      setOcupado(false)
    }
  }

  const vacio = campanas.length === 0 && anteriores.length === 0

  return (
    <section>
      <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#7A8A85', marginBottom: 12 }}>Historial</p>

      {aviso && (
        <p role="status" style={{ fontSize: 14, lineHeight: 1.6, borderRadius: 12, padding: '12px 14px', marginBottom: 12, color: aviso.bien ? '#00D1A7' : '#FF5252', background: aviso.bien ? 'rgba(0,209,167,0.1)' : 'rgba(255,82,82,0.12)' }}>
          {aviso.texto}
        </p>
      )}

      {vacio ? (
        <p style={{ fontSize: 13, color: '#7A8A85' }}>Todavía no se ha enviado ningún correo desde aquí.</p>
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {campanas.map(c => {
            const clave = c.parado ? 'parado' : c.estado
            const puedeReanudar = configurado && (c.estado === 'fallido' || c.parado)
            // Reenviar a los sin confirmar solo cuando la campaña ya no está en marcha.
            const puedeReenviar = configurado && c.sinConfirmar > 0 && !c.parado && (c.estado === 'enviado' || c.estado === 'fallido')
            const expandida = abierta === c.id
            return (
              <li key={c.id} style={{ listStyle: 'none', background: '#161817', border: '1px solid #2A2E2C', borderRadius: 12 }}>
                <button type="button" onClick={() => setAbierta(expandida ? null : c.id)} aria-expanded={expandida}
                  style={{ width: '100%', textAlign: 'left', padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.asunto || '(sin asunto)'}</span>
                    <span style={{ display: 'block', fontSize: 12, color: '#7A8A85', marginTop: 3 }}>
                      {fecha(c.enviadoEn ?? c.creadoEn)} · {c.estado === 'borrador' ? 'probado, sin enviar' : `${nombreGrupo(c.grupo)} · ${c.enviados} de ${c.destinatarios} enviados${c.sinConfirmar ? ` · ${c.sinConfirmar} sin confirmar` : ''}`}
                    </span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Estado clave={clave} />
                    <ChevronDown style={{ width: 16, height: 16, color: '#7A8A85', transform: expandida ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                  </span>
                </button>

                {expandida && (
                  <div style={{ padding: '0 14px 14px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                      {puedeReanudar && (
                        <button type="button" onClick={() => abrirReanudar(c)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40, padding: '0 14px', borderRadius: 10, border: '1px solid #FF5252', color: '#FF5252', fontSize: 13, fontWeight: 600 }}>
                          <RotateCcw style={{ width: 14, height: 14 }} /> Reanudar el envío…
                        </button>
                      )}
                      {puedeReenviar && (
                        <button type="button" onClick={() => abrirReenvio(c)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40, padding: '0 14px', borderRadius: 10, border: '1px solid #FFD54F', color: '#FFD54F', fontSize: 13, fontWeight: 600 }}>
                          <Send style={{ width: 14, height: 14 }} /> Reenviar a {c.sinConfirmar} sin confirmar…
                        </button>
                      )}
                    </div>
                    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #2A2E2C' }}>
                      <iframe
                        title={`Correo: ${c.asunto}`}
                        srcDoc={htmlCorreo({ asunto: c.asunto, cuerpo: c.cuerpo, botonTexto: c.botonTexto, botonUrl: c.botonUrl }, { enlaceBaja: '#' })}
                        sandbox=""
                        style={{ display: 'block', width: '100%', height: 480, border: 'none', background: '#F5F5F2' }}
                      />
                    </div>
                  </div>
                )}
              </li>
            )
          })}

          {anteriores.map(a => {
            const expandida = abierta === `anterior:${a.campana}`
            return (
              <li key={a.campana} style={{ listStyle: 'none', background: '#161817', border: '1px solid #2A2E2C', borderRadius: 12 }}>
                <button type="button" onClick={() => setAbierta(expandida ? null : `anterior:${a.campana}`)} aria-expanded={expandida}
                  style={{ width: '100%', textAlign: 'left', padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
                  <span>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#A3B1AC' }}>Campaña anterior · {a.campana}</span>
                    <span style={{ display: 'block', fontSize: 12, color: '#7A8A85', marginTop: 3 }}>
                      {fecha(a.fecha)} · {a.enviados} enviados{a.fallidos ? ` · ${a.fallidos} fallidos` : ''}
                    </span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#7A8A85' }}>Anterior</span>
                    <ChevronDown style={{ width: 16, height: 16, color: '#7A8A85', transform: expandida ? 'rotate(180deg)' : 'none' }} />
                  </span>
                </button>
                {expandida && (
                  <p style={{ padding: '0 14px 14px', fontSize: 13, color: '#7A8A85', lineHeight: 1.6 }}>
                    Se envió antes de que existiera esta pestaña: se sabe a cuántas personas llegó, pero su texto no quedó guardado en la base.
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {reanudando && (
        <DialogoEnviar
          titulo="Reanudar el envío"
          personas={reanudando.personas === null ? null : Math.max(reanudando.personas, reanudando.sinConfirmar)}
          ocupado={ocupado}
          error={reanudando.error}
          onConfirmar={confirmarReanudar}
          onCancelar={() => setReanudando(null)}
        >
          {reanudando.personas === null ? (
            <p>Calculando a quién le falta…</p>
          ) : (
            <>
              <p>
                <strong style={{ color: '#FFFFFF' }}>«{reanudando.asunto}»</strong> · grupo <strong style={{ color: '#FFFFFF' }}>{nombreGrupo(reanudando.grupo)}</strong>.
              </p>
              <p style={{ marginTop: 6 }}>
                Se escribirá a <strong style={{ color: '#FF5252', fontSize: 16 }}>{reanudando.personas.toLocaleString('es-ES')} {reanudando.personas === 1 ? 'persona' : 'personas'}</strong> que aún no lo tienen.
                A quien ya lo recibió no se le vuelve a mandar.
              </p>
              {reanudando.sinConfirmar > 0 && (
                <p style={{ marginTop: 6 }}>
                  Además, {reanudando.sinConfirmar} estaban en el lote que se cortó. Si el corte fue hace menos de 24 h se reenvía con la protección de Resend contra duplicados, y a quien ya le llegó no le llega otra vez; si fue antes, se dan por sin confirmar y no se tocan.
                </p>
              )}
            </>
          )}
        </DialogoEnviar>
      )}

      {reenviando && (
        <DialogoEnviar
          titulo="Reenviar a los sin confirmar"
          personas={reenviando.personas}
          ocupado={ocupado}
          error={reenviando.error}
          onConfirmar={confirmarReenvio}
          onCancelar={() => setReenviando(null)}
        >
          {reenviando.personas === null ? (
            <p>Calculando quién quedó sin confirmar…</p>
          ) : (
            <>
              <p>
                <strong style={{ color: '#FFFFFF' }}>«{reenviando.asunto}»</strong>
              </p>
              <p style={{ marginTop: 6 }}>
                Se reenviará a <strong style={{ color: '#FF5252', fontSize: 16 }}>{reenviando.personas.toLocaleString('es-ES')} {reenviando.personas === 1 ? 'persona' : 'personas'}</strong> de las que no se pudo confirmar que les llegara.
              </p>
              {reenviando.posiblesEnviados > 0 && (
                <p style={{ marginTop: 6, color: '#FFD54F' }}>
                  Ojo: a {reenviando.posiblesEnviados} de ellas es posible que ya les llegara, porque su lote salió y la respuesta se perdió. Si reenvías, lo recibirán dos veces.
                </p>
              )}
              {reenviando.fallados > 0 && (
                <p style={{ marginTop: 6 }}>
                  {reenviando.fallados} se dieron por no enviadas: a esas, casi con seguridad, no les llegó nada.
                </p>
              )}
            </>
          )}
        </DialogoEnviar>
      )}
    </section>
  )
}
