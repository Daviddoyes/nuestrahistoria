'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, FileUp, Upload } from 'lucide-react'
import {
  COLUMNAS_CSV, MAX_BYTES_CSV, MAX_FILAS_CSV, aCsv, type FilaRevisada,
} from '@/lib/importar-csv'
import { importarCsv, previsualizarCsv, type ResultadoImportacion } from '@/app/admin/gooals/importar/acciones'

/** Filas que se pintan de golpe. 5.000 filas en una tabla atascan un móvil. */
const FILAS_A_LA_VISTA = 500

type Fase =
  | { paso: 'elegir'; error: string }
  | { paso: 'leyendo' }
  | { paso: 'revision'; revisadas: FilaRevisada[] }
  | { paso: 'importando'; revisadas: FilaRevisada[] }
  | { paso: 'hecho'; resultado: Extract<ResultadoImportacion, { ok: true }> }

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

const boton: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40, padding: '0 14px', borderRadius: 10,
  fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
}
const botonPrincipal: React.CSSProperties = { ...boton, background: '#00D1A7', color: '#0B0B0B', border: 'none' }
const botonSecundario: React.CSSProperties = { ...boton, background: 'transparent', color: '#FFFFFF', border: '1px solid #2A2E2C' }

/** Descarga un texto como fichero. Solo en el navegador. */
function descargar(nombre: string, contenido: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

const numero = (n: number) => n.toLocaleString('es-ES')

/** Importación de gooals desde CSV en tres pasos: elegir, revisar e importar. */
export default function ImportarCsv() {
  const [fase, setFase] = useState<Fase>({ paso: 'elegir', error: '' })
  const [fichero, setFichero] = useState<File | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [soloErrores, setSoloErrores] = useState(false)
  const [verTodas, setVerTodas] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const revisadas = fase.paso === 'revision' || fase.paso === 'importando'
    ? fase.revisadas
    : fase.paso === 'hecho' ? fase.resultado.revisadas : null

  const cuentas = useMemo(() => {
    const c = { validas: 0, errores: 0, duplicadas: 0 }
    for (const r of revisadas ?? []) {
      if (r.tipo === 'valida') c.validas++
      else if (r.tipo === 'error') c.errores++
      else c.duplicadas++
    }
    return c
  }, [revisadas])

  const empezarDeNuevo = () => {
    setFichero(null)
    setSoloErrores(false)
    setVerTodas(false)
    setFase({ paso: 'elegir', error: '' })
    if (input.current) input.current.value = ''
  }

  // ── Paso 1 → 2: leer el fichero en el servidor ───────────────
  const elegir = async (f: File | undefined) => {
    if (!f) return
    // Lo obvio se dice sin ir al servidor; lo demás lo decide el servidor.
    if (!/\.csv$/i.test(f.name)) {
      setFase({ paso: 'elegir', error: `"${f.name}" no es un .csv. En Excel o Google Sheets: Archivo › Descargar › CSV.` })
      return
    }
    if (f.size > MAX_BYTES_CSV) {
      setFase({ paso: 'elegir', error: `El fichero pesa ${(f.size / 1024 / 1024).toFixed(1)} MB y el máximo son ${MAX_BYTES_CSV / 1024 / 1024} MB. Pártelo en varios.` })
      return
    }
    setFichero(f)
    setSoloErrores(false)
    setVerTodas(false)
    setFase({ paso: 'leyendo' })
    try {
      const datos = new FormData()
      datos.set('fichero', f)
      const r = await previsualizarCsv(datos)
      if (r.ok) setFase({ paso: 'revision', revisadas: r.revisadas })
      else setFase({ paso: 'elegir', error: r.error })
    } catch (e) {
      console.error('[importar CSV]', e)
      setFase({ paso: 'elegir', error: 'No se pudo leer el fichero. Revisa la conexión e inténtalo de nuevo.' })
    }
  }

  // ── Paso 3: importar ─────────────────────────────────────────
  const importar = async () => {
    if (fase.paso !== 'revision' || !fichero) return
    const anteriores = fase.revisadas
    setFase({ paso: 'importando', revisadas: anteriores })
    try {
      const datos = new FormData()
      datos.set('fichero', fichero)
      const r = await importarCsv(datos)
      if (r.ok) setFase({ paso: 'hecho', resultado: r })
      else setFase({ paso: 'elegir', error: r.error })
    } catch (e) {
      // Aquí no hay respuesta, así que no se sabe si entró algo: se dice tal cual.
      console.error('[importar CSV]', e)
      setFase({
        paso: 'elegir',
        error: 'Se perdió la conexión mientras se importaba y no se sabe cuántas entraron. Vuelve a subir el mismo fichero: las que ya estén dentro saldrán como duplicadas y solo se importará lo que falte.',
      })
    }
  }

  const descargarErrores = () => {
    const errores = (revisadas ?? []).flatMap(r => (r.tipo === 'error' ? [r] : []))
    const base = (fichero?.name ?? 'gooals.csv').replace(/\.csv$/i, '')
    descargar(`${base}-con-errores.csv`, aCsv(errores.map(r => r.fila), errores.map(r => `Línea ${r.fila.linea}: ${r.motivos.join(' ')}`)))
  }

  const tabla = (revisadas ?? []).filter(r => r.tipo !== 'duplicada' && (!soloErrores || r.tipo === 'error'))
  const duplicadas = (revisadas ?? []).flatMap(r => (r.tipo === 'duplicada' ? [r] : []))
  const aLaVista = verTodas ? tabla : tabla.slice(0, FILAS_A_LA_VISTA)

  return (
    // Sin <main> ni márgenes propios: los pone el layout de /admin, con las pestañas.
    <div>
      <div>
        <Link href="/admin/gooals" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#A3B1AC', textDecoration: 'none', minHeight: 40 }}>
          <ArrowLeft style={{ width: 15, height: 15 }} /> Volver al catálogo
        </Link>

        <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#00D1A7', fontWeight: 700, marginTop: 8 }}>
          Catálogo
        </p>
        <h1 className="fuente-titular" style={{ fontSize: 24, fontWeight: 600, marginTop: 4 }}>Importar CSV</h1>
        <p style={{ fontSize: 13, color: '#A3B1AC', marginTop: 6, lineHeight: 1.5 }}>
          Todo entra como <strong style={{ color: '#FFFFFF' }}>borrador</strong>, sin pin: no se ve en la app hasta que lo verificas en el panel.
        </p>

        {/* ── Paso 1: elegir el fichero ── */}
        {(fase.paso === 'elegir' || fase.paso === 'leyendo') && (
          <section style={{ marginTop: 20 }}>
            <label
              onDragOver={e => { e.preventDefault(); setArrastrando(true) }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={e => { e.preventDefault(); setArrastrando(false); if (fase.paso !== 'leyendo') elegir(e.dataTransfer.files[0]) }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
                position: 'relative', minHeight: 200, padding: 24, borderRadius: 16, textAlign: 'center',
                cursor: fase.paso === 'leyendo' ? 'wait' : 'pointer',
                border: `2px dashed ${arrastrando ? '#00D1A7' : '#2A2E2C'}`,
                background: arrastrando ? 'rgba(0,209,167,0.06)' : '#161817',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <input
                ref={input}
                type="file"
                accept=".csv,text/csv"
                disabled={fase.paso === 'leyendo'}
                onChange={e => elegir(e.target.files?.[0])}
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
              />
              {fase.paso === 'leyendo' ? (
                <>
                  <span className="w-6 h-6 border-2 border-[#2A2E2C] border-t-[#00D1A7] rounded-full animate-spin" />
                  <p style={{ fontSize: 14, color: '#A3B1AC' }}>Leyendo {fichero?.name} y comparando con el catálogo...</p>
                </>
              ) : (
                <>
                  <FileUp style={{ width: 28, height: 28, color: '#00D1A7' }} />
                  <p style={{ fontSize: 15, fontWeight: 600 }}>Suelta aquí el .csv o pulsa para elegirlo</p>
                  <p style={{ fontSize: 12, color: '#7A8A85' }}>
                    UTF-8 · hasta {numero(MAX_FILAS_CSV)} filas y {MAX_BYTES_CSV / 1024 / 1024} MB
                  </p>
                </>
              )}
            </label>

            {fase.paso === 'elegir' && fase.error && (
              <p role="alert" style={{ marginTop: 12, fontSize: 13, lineHeight: 1.5, color: '#FF5252', background: 'rgba(255,82,82,0.12)', borderRadius: 10, padding: '10px 12px', whiteSpace: 'pre-wrap' }}>
                {fase.error}
              </p>
            )}

            <div style={{ marginTop: 16, background: '#161817', border: '1px solid #2A2E2C', borderRadius: 12, padding: 14 }}>
              <p style={{ fontSize: 12, color: '#A3B1AC' }}>La primera línea tiene que ser exactamente:</p>
              <div style={{ overflowX: 'auto', marginTop: 6 }}>
                <code style={{ fontFamily: MONO, fontSize: 12, color: '#00D1A7', whiteSpace: 'nowrap' }}>{COLUMNAS_CSV.join(',')}</code>
              </div>
              <p style={{ fontSize: 12, color: '#7A8A85', marginTop: 8, lineHeight: 1.6 }}>
                categoria: viajes, naturaleza, eventos, deporte, gastronomia o vida · puntos: del 1 al 10 ·
                ambito: lugar o personal · ciudad, pais y consulta_mapa pueden ir vacíos. Un personal no puede llevar ciudad.
              </p>
              <button type="button" onClick={() => descargar('plantilla-gooals.csv', aCsv([]))} style={{ ...botonSecundario, marginTop: 10 }}>
                <Download style={{ width: 14, height: 14 }} /> Descargar plantilla
              </button>
            </div>
          </section>
        )}

        {/* ── Resultado de la importación ── */}
        {fase.paso === 'hecho' && (
          <section style={{ marginTop: 20 }}>
            {fase.resultado.fallo ? (
              <div role="alert" style={{ background: 'rgba(255,82,82,0.12)', border: '1px solid rgba(255,82,82,0.4)', borderRadius: 12, padding: 14 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#FF5252' }}>
                  Se cortó a mitad: entraron {numero(fase.resultado.insertadas)} de {numero(fase.resultado.insertadas + fase.resultado.fallo.pendientes)}
                </p>
                <p style={{ fontSize: 13, color: '#A3B1AC', marginTop: 6, lineHeight: 1.6 }}>
                  Están dentro, como borrador, las válidas de antes de la línea {fase.resultado.fallo.desdeLinea}.
                  Desde esa línea no ha entrado ninguna ({numero(fase.resultado.fallo.pendientes)}).
                  Motivo: {fase.resultado.fallo.mensaje}
                </p>
                <p style={{ fontSize: 13, color: '#A3B1AC', marginTop: 6, lineHeight: 1.6 }}>
                  Puedes volver a subir el mismo fichero: las que ya entraron saldrán como duplicadas y solo se importará lo que falta.
                </p>
              </div>
            ) : (
              <div role="status" style={{ background: 'rgba(0,209,167,0.1)', border: '1px solid rgba(0,209,167,0.4)', borderRadius: 12, padding: 14 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#00D1A7' }}>
                  {fase.resultado.insertadas === 0 ? 'No había nada que importar' : `${numero(fase.resultado.insertadas)} gooals importados como borrador ✓`}
                </p>
                <p style={{ fontSize: 13, color: '#A3B1AC', marginTop: 6 }}>
                  Los tienes en el panel, con el filtro Borrador.
                </p>
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <Link href="/admin/gooals" style={{ ...botonPrincipal, textDecoration: 'none' }}>Ir al catálogo</Link>
              <button type="button" onClick={empezarDeNuevo} style={botonSecundario}>Importar otro fichero</button>
            </div>
          </section>
        )}

        {/* ── Paso 2 y 3: revisar e importar ── */}
        {revisadas && (
          <section style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <p aria-live="polite" style={{ fontSize: 15, fontWeight: 600, marginRight: 'auto' }}>
                <span style={{ color: '#00D1A7' }}>{numero(cuentas.validas)} {cuentas.validas === 1 ? 'fila lista' : 'filas listas'}</span>
                <span style={{ color: '#7A8A85' }}> · </span>
                <span style={{ color: cuentas.errores ? '#FF5252' : '#7A8A85' }}>{numero(cuentas.errores)} con error</span>
                <span style={{ color: '#7A8A85' }}> · </span>
                <span style={{ color: cuentas.duplicadas ? '#FFD54F' : '#7A8A85' }}>{numero(cuentas.duplicadas)} {cuentas.duplicadas === 1 ? 'duplicada' : 'duplicadas'}</span>
              </p>
              {fase.paso !== 'hecho' && (
                <span style={{ fontSize: 12, color: '#7A8A85' }}>{fichero?.name}</span>
              )}
            </div>

            {fase.paso !== 'hecho' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={importar}
                  disabled={cuentas.validas === 0 || fase.paso === 'importando'}
                  style={{ ...botonPrincipal, opacity: cuentas.validas === 0 ? 0.4 : 1, cursor: cuentas.validas === 0 ? 'not-allowed' : fase.paso === 'importando' ? 'wait' : 'pointer' }}
                >
                  {fase.paso === 'importando'
                    ? <><span className="w-3.5 h-3.5 border-2 border-[#0B0B0B] border-t-transparent rounded-full animate-spin" /> Importando {numero(cuentas.validas)}...</>
                    : <><Upload style={{ width: 14, height: 14 }} /> Importar {cuentas.validas === 1 ? 'la válida' : `las ${numero(cuentas.validas)} válidas`}</>}
                </button>
                <button type="button" onClick={empezarDeNuevo} disabled={fase.paso === 'importando'} style={botonSecundario}>
                  Elegir otro fichero
                </button>
              </div>
            )}

            {cuentas.errores > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 12 }}>
                <button type="button" onClick={descargarErrores} style={botonSecundario}>
                  <Download style={{ width: 14, height: 14 }} /> Descargar las {numero(cuentas.errores)} con error
                </button>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#A3B1AC', minHeight: 40, cursor: 'pointer' }}>
                  <input type="checkbox" checked={soloErrores} onChange={e => setSoloErrores(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#00D1A7' }} />
                  Ver solo las que fallan
                </label>
              </div>
            )}

            {/* Tabla: las válidas en normal, las que fallan en rojo con su motivo. */}
            {tabla.length > 0 && (
              <div style={{ overflowX: 'auto', marginTop: 12, border: '1px solid #2A2E2C', borderRadius: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 760 }}>
                  <thead>
                    <tr style={{ background: '#161817', textAlign: 'left', color: '#7A8A85' }}>
                      {['Línea', 'Título', 'Categoría', 'Puntos', 'Ámbito', 'Ciudad', 'País', 'Consulta mapa'].map(c => (
                        <th key={c} style={{ padding: '9px 10px', fontWeight: 600, whiteSpace: 'nowrap' }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aLaVista.map(r => {
                      const f = r.fila
                      const mal = r.tipo === 'error'
                      const celda: React.CSSProperties = { padding: '8px 10px', borderTop: mal ? 'none' : '1px solid #1E2120', verticalAlign: 'top' }
                      return (
                        <FilaTabla key={f.linea} mal={mal} motivos={mal ? r.motivos : null}>
                          <td style={{ ...celda, fontFamily: MONO, color: mal ? '#FF5252' : '#7A8A85' }}>{f.linea}</td>
                          <td style={{ ...celda, color: '#FFFFFF', minWidth: 220 }}>{f.titulo}</td>
                          <td style={celda}>{f.categoria}</td>
                          <td style={celda}>{f.puntos}</td>
                          <td style={celda}>{f.ambito}</td>
                          <td style={celda}>{f.ciudad}</td>
                          <td style={celda}>{f.pais}</td>
                          <td style={{ ...celda, color: '#7A8A85' }}>{f.consulta_mapa}</td>
                        </FilaTabla>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!verTodas && tabla.length > FILAS_A_LA_VISTA && (
              <button type="button" onClick={() => setVerTodas(true)} style={{ ...botonSecundario, marginTop: 10 }}>
                Ver las {numero(tabla.length - FILAS_A_LA_VISTA)} filas restantes
              </button>
            )}

            {/* Duplicadas: aparte, porque no hay nada que corregir en ellas. */}
            {duplicadas.length > 0 && (
              <details style={{ marginTop: 18, background: '#161817', border: '1px solid #2A2E2C', borderRadius: 12, padding: '10px 14px' }}>
                <summary style={{ cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#FFD54F', minHeight: 32, display: 'flex', alignItems: 'center' }}>
                  {numero(duplicadas.length)} {duplicadas.length === 1 ? 'duplicada' : 'duplicadas'} · no se importan
                </summary>
                <ul style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {duplicadas.map(r => (
                    <li key={r.fila.linea} style={{ listStyle: 'none', fontSize: 12, color: '#A3B1AC', lineHeight: 1.5 }}>
                      <span style={{ fontFamily: MONO, color: '#7A8A85' }}>Línea {r.fila.linea}</span> · <span style={{ color: '#FFFFFF' }}>{r.fila.titulo}</span> · {r.motivo}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

/** Una fila de la tabla y, si falla, otra debajo con el motivo en rojo. */
function FilaTabla({ mal, motivos, children }: { mal: boolean; motivos: string[] | null; children: React.ReactNode }) {
  const fondo = mal ? 'rgba(255,82,82,0.08)' : 'transparent'
  return (
    <>
      <tr style={{ background: fondo, color: mal ? '#FFB3B3' : '#A3B1AC', borderTop: mal ? '1px solid rgba(255,82,82,0.3)' : undefined }}>
        {children}
      </tr>
      {motivos && (
        <tr style={{ background: fondo }}>
          <td />
          <td colSpan={7} style={{ padding: '0 10px 9px', color: '#FF5252', fontSize: 12, lineHeight: 1.5 }}>
            {motivos.join(' ')}
          </td>
        </tr>
      )}
    </>
  )
}
