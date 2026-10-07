'use client'

import { useState, useEffect, useRef } from 'react'
import { Sticker } from 'lucide-react'
import { dibujarSello, sacarSello, type Sello, type Salida } from '@/lib/sello'

type Props = {
  titulo: string
  puntos: number
}

const QUE_PASO: Record<Salida, string> = {
  copiado: 'Copiado. Pégalo en tu historia.',
  compartir: 'Listo para compartir.',
  descargado: 'Descargado. Está en tu galería.',
}

/**
 * "Sello para tu historia": un PNG transparente con el gooal conseguido, para
 * pegarlo encima de una historia de Instagram.
 *
 * ── EL PNG SE HACE AL ABRIR, NO AL PULSAR ─────────────────
 *
 * En iOS, la hoja de compartir tiene que abrirse en el MISMO gesto del dedo. Si
 * al pulsar hay un await por delante generando la imagen, Safari la bloquea sin
 * decir nada. Así que se dibuja al montar y se guarda hecha; al pulsar solo
 * queda sacarla.
 */
export default function BotonSello({ titulo, puntos }: Props) {
  const [sello, setSello] = useState<Sello | null>(null)
  const [aviso, setAviso] = useState('')
  const [sacando, setSacando] = useState(false)
  const vivo = useRef(true)

  useEffect(() => {
    vivo.current = true
    dibujarSello(titulo, puntos)
      .then(s => { if (vivo.current) setSello(s) })
      .catch(e => console.error('[sello]', e))
    return () => { vivo.current = false }
  }, [titulo, puntos])

  const pulsar = async () => {
    if (!sello || sacando) return
    setSacando(true)
    try {
      setAviso(QUE_PASO[await sacarSello(sello, titulo)])
    } catch (e) {
      console.error('[sello:sacar]', e)
      setAviso('No se ha podido. Inténtalo otra vez.')
    } finally {
      setSacando(false)
    }
  }

  return (
    <>
      <button
        onClick={pulsar}
        disabled={!sello || sacando}
        className="w-full py-3 rounded-xl text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2 border border-[#2A2E2C] text-[#FFFFFF] active:bg-[#1E2120] disabled:opacity-50 transition-colors"
      >
        <Sticker className="w-4 h-4" /> Sello para tu historia
      </button>
      {aviso && (
        <p role="status" style={{ fontSize: 12.5, color: '#7A8A85', textAlign: 'center', marginTop: -2 }}>
          {aviso}
        </p>
      )}
    </>
  )
}
