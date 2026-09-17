'use client'

import { useState, useEffect, useMemo } from 'react'
import type { FiltrosAdmin, GooalAdmin } from '@/types/gooals'
import BarraFiltros from './BarraFiltros'
import BarraLote from './BarraLote'
import FilaGooal, { type BorradorFila } from './FilaGooal'
import Confirmacion from './Confirmacion'
import RecordatorioCriterio from '../RecordatorioCriterio'

/** Respiro del buscador: no se consulta en cada tecla. */
const ESPERA_BUSQUEDA = 300

/** Por defecto, BORRADOR: es donde está el trabajo pendiente. */
const FILTROS_INICIALES: FiltrosAdmin = {
  busqueda: '', estado: 'borrador', categoria: 'todas', ambito: 'todos', sinPin: false, categoriaDudosa: false,
  repaso: 'ninguno',
}

type Resultado =
  // sinRepaso: la tabla de propuestas aún no existe (falta pegar fase3k.sql).
  | { clave: string; gooals: GooalAdmin[]; total: number; porPagina: number; sinRepaso?: boolean }
  | { clave: string; error: string }

type Pendiente =
  | { tipo: 'descartar'; accion: () => void; filas: number }
  | { tipo: 'lote'; estado: 'verificado' | 'borrador'; ids: string[] }
  | { tipo: 'borrar'; gooal: GooalAdmin }
  | { tipo: 'traducciones'; ids: string[] }

type Props = {
  /** Cambia desde fuera (tras crear un gooal) para volver a pedir la página. */
  recarga: number
}

const texto = (valor: string | null | undefined) => (valor ?? '').trim() || null

/** Lista de trabajo del catálogo: buscar, corregir y verificar sin tocar SQL. */
export default function ListaTrabajo({ recarga }: Props) {
  const [filtros, setFiltros] = useState<FiltrosAdmin>(FILTROS_INICIALES)
  const [textoBusqueda, setTextoBusqueda] = useState('')
  const [pagina, setPagina] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [borradores, setBorradores] = useState<Record<string, BorradorFila>>({})
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [mapaAbierto, setMapaAbierto] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)
  const [aplicando, setAplicando] = useState(false)
  const [aviso, setAviso] = useState('')
  const [refresco, setRefresco] = useState(0)

  // La clave identifica QUÉ se está pidiendo. "Cargando" no es un estado aparte:
  // es que la última respuesta no corresponde todavía a la petición actual.
  const clave = JSON.stringify({ filtros, pagina, recarga, refresco })
  const cargando = resultado?.clave !== clave
  const filasSinGuardar = Object.keys(borradores).length

  // ── Pedir la página ───────────────────────────────────────
  useEffect(() => {
    let vivo = true
    const params = new URLSearchParams({ pagina: String(pagina), estado: filtros.estado, categoria: filtros.categoria, ambito: filtros.ambito })
    if (filtros.sinPin) params.set('sinPin', '1')
    if (filtros.categoriaDudosa) params.set('categoriaDudosa', '1')
    if (filtros.repaso !== 'ninguno') params.set('repaso', filtros.repaso)
    if (filtros.busqueda) params.set('busqueda', filtros.busqueda)

    fetch(`/api/admin/gooals-v2?${params}`)
      .then(async res => {
        const json = await res.json().catch(() => ({}))
        if (!vivo) return
        if (!res.ok) setResultado({ clave, error: json.error ?? 'No se pudo cargar el catálogo.' })
        else setResultado({ clave, gooals: json.gooals, total: json.total, porPagina: json.porPagina, sinRepaso: json.sinRepaso })
      })
      .catch(() => { if (vivo) setResultado({ clave, error: 'No se pudo cargar el catálogo. Revisa la conexión.' }) })
    return () => { vivo = false }
  }, [clave, filtros, pagina])

  /**
   * Cualquier cosa que cambie de página o de filtro pasa por aquí: si hay filas
   * editadas sin guardar, se pide confirmación antes de perderlas.
   */
  const conCambiosGuardados = (accion: () => void) => {
    if (filasSinGuardar === 0) { accion(); return }
    setPendiente({ tipo: 'descartar', accion, filas: filasSinGuardar })
  }

  const irA = (cambio: () => void) => conCambiosGuardados(() => {
    setBorradores({})
    setSeleccion(new Set())
    setMapaAbierto(null)
    cambio()
  })

  // ── Buscador con respiro ──────────────────────────────────
  useEffect(() => {
    const limpio = textoBusqueda.trim()
    if (limpio === filtros.busqueda) return
    const t = setTimeout(() => {
      irA(() => { setFiltros(f => ({ ...f, busqueda: limpio })); setPagina(0) })
    }, ESPERA_BUSQUEDA)
    return () => clearTimeout(t)
    // irA cambia en cada render; lo que dispara la búsqueda es solo el texto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textoBusqueda, filtros.busqueda])

  // Aviso del navegador al cerrar o recargar con filas sin guardar.
  useEffect(() => {
    if (filasSinGuardar === 0) return
    const alSalir = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', alSalir)
    return () => window.removeEventListener('beforeunload', alSalir)
  }, [filasSinGuardar])

  const datos = resultado && 'gooals' in resultado ? resultado : null
  const gooals = useMemo(() => datos?.gooals ?? [], [datos])
  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / datos.porPagina)) : 1

  // ── Edición de filas ──────────────────────────────────────
  const editar = (id: string, cambio: BorradorFila) => {
    const original = gooals.find(g => g.id === id)
    if (!original) return
    setBorradores(prev => {
      const siguiente: BorradorFila = { ...prev[id], ...cambio }
      // Lo que vuelve a su valor original deja de contar como cambio: si no, una
      // fila tocada y devuelta a como estaba pediría confirmación para nada.
      for (const k of Object.keys(siguiente) as (keyof BorradorFila)[]) {
        const igual = k === 'ciudad' || k === 'pais'
          ? texto(siguiente[k] as string) === original[k]
          : siguiente[k] === original[k]
        if (igual) delete siguiente[k]
      }
      const resto = { ...prev }
      if (Object.keys(siguiente).length === 0) delete resto[id]
      else resto[id] = siguiente
      return resto
    })
  }

  const descartar = (id: string) => setBorradores(prev => {
    const resto = { ...prev }
    delete resto[id]
    return resto
  })

  const guardado = (g: GooalAdmin) => {
    descartar(g.id)
    setResultado(r => (r && 'gooals' in r ? { ...r, gooals: r.gooals.map(x => (x.id === g.id ? g : x)) } : r))
    // Si le han quitado el pin, el mapa de esa fila ya no tiene nada que enseñar.
    if (g.lat === null && mapaAbierto === g.id) setMapaAbierto(null)
  }

  // ── En bloque ─────────────────────────────────────────────
  const aplicarLote = async (estado: 'verificado' | 'borrador', ids: string[]) => {
    setAplicando(true)
    setAviso('')
    try {
      const res = await fetch('/api/admin/gooals-v2/lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, estado }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'No se pudo aplicar.')
      setAviso(`${json.actualizados} ${estado === 'verificado' ? 'verificados' : 'mandados a borrador'} ✓`)
      setSeleccion(new Set())
      // Se vuelve a pedir la página: con el filtro en "borrador", los verificados
      // tienen que desaparecer de la lista y el total tiene que bajar.
      setRefresco(n => n + 1)
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo aplicar.')
    } finally {
      setAplicando(false)
      setPendiente(null)
    }
  }

  const borrar = async (g: GooalAdmin) => {
    setAplicando(true)
    setAviso('')
    try {
      const res = await fetch(`/api/admin/gooals-v2?id=${encodeURIComponent(g.id)}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'No se pudo borrar.')
      setAviso(`"${g.titulo}" borrado ✓`)
      descartar(g.id)
      setRefresco(n => n + 1)
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo borrar.')
    } finally {
      setAplicando(false)
      setPendiente(null)
    }
  }

  /**
   * Confirma de golpe las traducciones de esta página.
   *
   * Solo aquí: arreglar un título mal escrito es mecánico y se ve de un vistazo.
   * Lo de criterio se decide de una en una, y por eso este botón no existe en la
   * otra cola (ni el servidor lo aceptaría: exige tipo='traduccion').
   */
  const aplicarTraducciones = async (ids: string[]) => {
    setAplicando(true)
    setAviso('')
    try {
      const res = await fetch('/api/admin/revision/lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'No se pudieron aplicar.')
      const saltadas = (json.saltadas ?? []) as { titulo: string; porque: string }[]
      setAviso(
        `${json.aplicadas} ${json.aplicadas === 1 ? 'traducción aplicada' : 'traducciones aplicadas'} ✓`
        + (saltadas.length ? ` · ${saltadas.length} sin tocar: ${saltadas.map(s => `«${s.titulo}» (${s.porque})`).join(', ')}` : ''),
      )
      setSeleccion(new Set())
      // Aquí sí se vuelve a pedir la página: han cambiado 50 filas de golpe y las
      // aplicadas tienen que desaparecer de la cola.
      setRefresco(n => n + 1)
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudieron aplicar.')
    } finally {
      setAplicando(false)
      setPendiente(null)
    }
  }

  /** Las traducciones de esta página que aún tienen recambio escrito. */
  const traduccionesEnPagina = filtros.repaso === 'traducciones'
    ? gooals.filter(g => g.revision?.estado === 'pendiente' && g.revision.titulo_propuesto)
    : []

  const sinGuardarEnLote = (ids: string[]) => ids.filter(id => borradores[id]).length

  return (
    <div>
      <div style={{ marginBottom: 10 }}><RecordatorioCriterio plegado /></div>

      <BarraFiltros
        filtros={filtros}
        texto={textoBusqueda}
        onTexto={setTextoBusqueda}
        onCambiar={cambio => irA(() => { setFiltros(f => ({ ...f, ...cambio })); setPagina(0) })}
        total={datos?.total ?? null}
        cargando={cargando}
      />

      {aviso && (
        <p role="status" style={{ fontSize: 13, color: '#A3B1AC', background: '#1E2120', borderRadius: 8, padding: '8px 10px', marginTop: 10 }}>
          {aviso}
        </p>
      )}

      {resultado && 'error' in resultado && !cargando ? (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#FF5252' }}>{resultado.error}</p>
          <button
            type="button"
            onClick={() => setRefresco(n => n + 1)}
            style={{ marginTop: 10, minHeight: 40, padding: '0 16px', borderRadius: 8, border: '1px solid #2A2E2C', color: '#FFFFFF', fontSize: 13 }}
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          {traduccionesEnPagina.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, background: 'rgba(0,209,167,0.07)', border: '1px solid rgba(0,209,167,0.35)', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
              <p style={{ flex: 1, minWidth: 200, fontSize: 13, color: '#A3B1AC', lineHeight: 1.4 }}>
                Títulos mal escritos, no gooals mal planteados: léelos y confírmalos de golpe.
              </p>
              <button
                type="button"
                onClick={() => setPendiente({ tipo: 'traducciones', ids: traduccionesEnPagina.map(g => g.id) })}
                disabled={aplicando}
                style={{ minHeight: 40, padding: '0 14px', borderRadius: 8, border: 'none', background: '#00D1A7', color: '#0B0B0B', fontSize: 13, fontWeight: 700 }}
              >
                Aceptar las {traduccionesEnPagina.length} de esta página
              </button>
            </div>
          )}

          <BarraLote
            seleccionados={seleccion.size}
            enPagina={gooals.length}
            onTodos={todos => setSeleccion(todos ? new Set(gooals.map(g => g.id)) : new Set())}
            onAplicar={estado => setPendiente({ tipo: 'lote', estado, ids: [...seleccion] })}
          />

          {!datos && cargando ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse" style={{ height: 150, borderRadius: 12, background: '#161817' }} />
              ))}
            </div>
          ) : gooals.length === 0 ? (
            <p style={{ fontSize: 14, color: '#7A8A85', textAlign: 'center', padding: '28px 0' }}>
              {datos?.sinRepaso
                ? 'Todavía no hay repaso de títulos: falta pegar supabase/fase3k.sql y pasar el script.'
                : filtros.repaso === 'traducciones'
                  ? 'No queda ninguna traducción por confirmar.'
                  : filtros.repaso === 'decidir'
                    ? 'No queda nada por decidir en el repaso de títulos.'
                  : filtros.estado === 'borrador' && !filtros.busqueda && !filtros.sinPin && !filtros.categoriaDudosa && filtros.categoria === 'todas' && filtros.ambito === 'todos'
                    ? 'No queda nada en borrador. Todo revisado.'
                    : filtros.categoriaDudosa && filtros.estado === 'todos' && !filtros.busqueda && !filtros.sinPin && filtros.categoria === 'todas' && filtros.ambito === 'todos'
                      ? 'No queda ninguna categoría dudosa. Todo revisado.'
                      : 'Ningún gooal coincide con estos filtros.'}
            </p>
          ) : (
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: cargando ? 0.55 : 1, transition: 'opacity 0.15s' }}>
              {gooals.map(g => (
                <FilaGooal
                  key={g.id}
                  gooal={g}
                  borrador={borradores[g.id]}
                  seleccionado={seleccion.has(g.id)}
                  mapaAbierto={mapaAbierto === g.id}
                  onEditar={editar}
                  onDescartar={descartar}
                  onGuardado={guardado}
                  onSeleccionar={(id, sel) => setSeleccion(prev => {
                    const s = new Set(prev)
                    if (sel) s.add(id); else s.delete(id)
                    return s
                  })}
                  onMapa={setMapaAbierto}
                  onPedirBorrar={gooal => setPendiente({ tipo: 'borrar', gooal })}
                />
              ))}
            </ul>
          )}

          {datos && datos.total > datos.porPagina && (
            <nav aria-label="Páginas" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14 }}>
              <button
                type="button"
                onClick={() => irA(() => setPagina(p => Math.max(0, p - 1)))}
                disabled={pagina === 0 || cargando}
                style={{ minHeight: 40, padding: '0 14px', borderRadius: 8, border: '1px solid #2A2E2C', color: '#FFFFFF', fontSize: 13, opacity: pagina === 0 ? 0.4 : 1 }}
              >
                Anterior
              </button>
              <span style={{ fontSize: 13, color: '#A3B1AC' }}>Página {pagina + 1} de {totalPaginas}</span>
              <button
                type="button"
                onClick={() => irA(() => setPagina(p => Math.min(totalPaginas - 1, p + 1)))}
                disabled={pagina >= totalPaginas - 1 || cargando}
                style={{ minHeight: 40, padding: '0 14px', borderRadius: 8, border: '1px solid #2A2E2C', color: '#FFFFFF', fontSize: 13, opacity: pagina >= totalPaginas - 1 ? 0.4 : 1 }}
              >
                Siguiente
              </button>
            </nav>
          )}
        </>
      )}

      {pendiente?.tipo === 'descartar' && (
        <Confirmacion
          titulo="Hay cambios sin guardar"
          texto={`Tienes ${pendiente.filas} ${pendiente.filas === 1 ? 'fila editada' : 'filas editadas'} sin guardar. Si sigues, se pierden.`}
          confirmar="Descartar y seguir"
          peligro
          onConfirmar={() => { const accion = pendiente.accion; setPendiente(null); accion() }}
          onCancelar={() => {
            // Si lo que se canceló fue la búsqueda, el buscador vuelve a lo que estaba aplicado.
            setTextoBusqueda(filtros.busqueda)
            setPendiente(null)
          }}
        />
      )}

      {pendiente?.tipo === 'lote' && (
        <Confirmacion
          titulo={pendiente.estado === 'verificado' ? `Verificar ${pendiente.ids.length}` : `Mandar ${pendiente.ids.length} a borrador`}
          texto={
            (pendiente.estado === 'verificado'
              ? `Vas a verificar ${pendiente.ids.length} ${pendiente.ids.length === 1 ? 'gooal' : 'gooals'}: pasarán a verse en la app.`
              : `Vas a mandar ${pendiente.ids.length} ${pendiente.ids.length === 1 ? 'gooal' : 'gooals'} a borrador: dejarán de verse en el catálogo.`) +
            (sinGuardarEnLote(pendiente.ids) > 0
              ? ` Ojo: ${sinGuardarEnLote(pendiente.ids)} tienen cambios sin guardar, y el cambio de estado NO los guarda.`
              : '')
          }
          confirmar={pendiente.estado === 'verificado' ? 'Verificar' : 'Mandar a borrador'}
          ocupado={aplicando}
          onConfirmar={() => aplicarLote(pendiente.estado, pendiente.ids)}
          onCancelar={() => setPendiente(null)}
        />
      )}

      {pendiente?.tipo === 'borrar' && (
        <Confirmacion
          titulo="Borrar gooal"
          texto={`Vas a borrar "${pendiente.gooal.titulo}". No lo tiene nadie, pero no se puede deshacer.`}
          confirmar="Borrar"
          peligro
          ocupado={aplicando}
          onConfirmar={() => borrar(pendiente.gooal)}
          onCancelar={() => setPendiente(null)}
        />
      )}

      {pendiente?.tipo === 'traducciones' && (
        <Confirmacion
          titulo={`Aceptar ${pendiente.ids.length} traducciones`}
          texto={
            `Vas a cambiar el título de ${pendiente.ids.length} ${pendiente.ids.length === 1 ? 'gooal' : 'gooals'} de golpe, por el que propone la IA. `
            + 'Son arreglos de cómo está escrito el título: lo que hace la persona no cambia. '
            + 'Si alguno ya tuviera ese título, ese se queda como está y te lo digo.'
          }
          confirmar="Aceptar todas"
          ocupado={aplicando}
          onConfirmar={() => aplicarTraducciones(pendiente.ids)}
          onCancelar={() => setPendiente(null)}
        />
      )}
    </div>
  )
}
