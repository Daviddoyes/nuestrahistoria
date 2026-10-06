'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react'
import { firmarFotos, type FotoFirmada } from '@/lib/fotos-privadas'

/**
 * Las fotos de la gente viven en un cubo privado, así que no se pueden pintar
 * con una dirección fija: hay que pedirle al servidor una dirección FIRMADA, y
 * esas CADUCAN.
 *
 * Esto resuelve las dos cosas que eso trae:
 *
 * 1. CADUCAN. Si alguien deja el muro abierto una hora y vuelve, las direcciones
 *    ya no valen y las fotos se quedarían en un hueco, sin que la persona
 *    entienda por qué. Aquí, cuando una imagen falla al cargar, se vuelve a
 *    pedir sola. Una vez: si falla la segunda, es que el fichero no está, y eso
 *    no se arregla pidiéndolo mil veces.
 *
 * 2. SON MUCHAS. El muro enseña cuarenta posts y el perfil una rejilla entera.
 *    Pedir una por una serían cuarenta viajes al servidor, así que las
 *    peticiones se juntan: todo lo que se pida en el mismo instante sale en una
 *    sola llamada.
 *
 * Las pantallas no deciden nada sobre permisos: piden por el id de la fila y
 * reciben lo que puedan ver. Quien decide es puedeVerLaFoto(), en el servidor.
 */

type Estado = FotoFirmada & { cargando: boolean }

type Contexto = {
  pedir: (id: string) => void
  refrescar: (id: string) => void
  fotos: Record<string, Estado>
}

const CtxFotos = createContext<Contexto | null>(null)

const VACIO: Estado = { foto: null, video: null, puedeVer: false, cargando: true }

export function ProveedorFotosPrivadas({ children }: { children: React.ReactNode }) {
  const [fotos, setFotos] = useState<Record<string, Estado>>({})
  // Lo pedido va en una ref y no en el estado: cambiarlo no tiene que repintar
  // nada, y así no se dispara un ciclo de peticiones.
  const enCola = useRef(new Set<string>())
  const yaPedido = useRef(new Set<string>())
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const vivo = useRef(true)

  // Se ENCIENDE al montar y se apaga al desmontar. Encenderla aquí no sobra:
  // React monta, desmonta y vuelve a montar los componentes en desarrollo, y sin
  // esta línea la bandera se quedaba apagada para siempre tras el primer ciclo.
  // Resultado: la respuesta llegaba del servidor y se tiraba, y las fotos no
  // aparecían nunca. Costó un rato encontrarlo porque no da ningún error.
  useEffect(() => {
    vivo.current = true
    return () => { vivo.current = false }
  }, [])

  const vaciarCola = useCallback(async () => {
    const ids = [...enCola.current]
    enCola.current.clear()
    temporizador.current = null
    if (!ids.length) return
    try {
      const firmadas = await firmarFotos(ids)
      if (!vivo.current) return
      setFotos(antes => {
        const nuevo = { ...antes }
        for (const id of ids) {
          nuevo[id] = { ...(firmadas[id] ?? { foto: null, video: null, puedeVer: false }), cargando: false }
        }
        return nuevo
      })
    } catch (e) {
      console.error('[FotosPrivadas]', String(e))
      if (!vivo.current) return
      setFotos(antes => {
        const nuevo = { ...antes }
        for (const id of ids) nuevo[id] = { foto: null, video: null, puedeVer: false, cargando: false }
        return nuevo
      })
    }
  }, [])

  const encolar = useCallback((id: string) => {
    enCola.current.add(id)
    if (temporizador.current) return
    // Un respiro mínimo: lo que pida toda la pantalla al montarse cae dentro.
    temporizador.current = setTimeout(vaciarCola, 16)
  }, [vaciarCola])

  const pedir = useCallback((id: string) => {
    if (!id || yaPedido.current.has(id)) return
    yaPedido.current.add(id)
    encolar(id)
  }, [encolar])

  const refrescar = useCallback((id: string) => {
    if (!id) return
    setFotos(antes => ({ ...antes, [id]: { ...(antes[id] ?? VACIO), cargando: true } }))
    encolar(id)
  }, [encolar])

  const valor = useMemo(() => ({ pedir, refrescar, fotos }), [pedir, refrescar, fotos])
  return <CtxFotos.Provider value={valor}>{children}</CtxFotos.Provider>
}

/**
 * La dirección firmada de una foto. Fuera del proveedor devuelve "cargando"
 * para siempre en vez de reventar: un componente suelto en una prueba no debe
 * tirar la pantalla.
 */
export function useFotoPrivada(userGooalId: string | null | undefined) {
  const ctx = useContext(CtxFotos)
  useEffect(() => {
    if (ctx && userGooalId) ctx.pedir(userGooalId)
  }, [ctx, userGooalId])

  const estado = (userGooalId && ctx?.fotos[userGooalId]) || VACIO
  const refrescar = useCallback(() => {
    if (ctx && userGooalId) ctx.refrescar(userGooalId)
  }, [ctx, userGooalId])

  return { ...estado, refrescar }
}

/**
 * Una foto privada ya pintada, con el reintento puesto.
 *
 * `fondo` es lo que se ve mientras llega, si no puede verse o si no hay foto:
 * el degradado de la categoría, que es lo que la app lleva usando desde siempre
 * para los gooals sin imagen.
 */
export function FotoPrivada({
  userGooalId, alt, fondo, className, style,
}: {
  userGooalId: string
  alt: string
  fondo?: string
  className?: string
  style?: React.CSSProperties
}) {
  const { foto, cargando, refrescar } = useFotoPrivada(userGooalId)
  // Un solo reintento. Si la segunda también falla, el fichero no está, y
  // volver a pedirlo sería un bucle contra el servidor.
  const reintentado = useRef(false)

  useEffect(() => { reintentado.current = false }, [foto])

  return (
    <div className={className} style={{ background: fondo, overflow: 'hidden', ...style }}>
      {foto && (
        // eslint-disable-next-line @next/next/no-img-element -- direcciones firmadas que caducan
        <img
          src={foto}
          alt={alt}
          loading="lazy"
          onError={() => {
            if (reintentado.current) return
            reintentado.current = true
            refrescar()
          }}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}
      {!foto && cargando && (
        <div aria-hidden style={{ width: '100%', height: '100%' }} className="animate-pulse" />
      )}
    </div>
  )
}
