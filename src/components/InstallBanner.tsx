'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { isSafariIOS, isAndroidChrome, isStandalone } from '@/lib/platform'
import InstallStepsSheet from './InstallStepsSheet'
import { ALTO_NAV_TOTAL, conBarraInferior } from './BottomNav'
import { tocaOfrecerInstalar } from '@/lib/instalar'

type Platform = 'ios' | 'android' | null

type BeforeInstallPromptEvent = Event & {
  prompt: () => void
  userChoice: Promise<{ outcome: string }>
}

const DISMISSED_KEY = 'install-dismissed'

/**
 * La variable que dice cuánto alto ocupa el banner.
 *
 * La lee `AppShell` para dejarle sitio de verdad. Ver «QUE OCUPE SITIO» aquí
 * abajo.
 */
export const VAR_ALTO = '--alto-banner'

export default function InstallBanner() {
  const pathname = usePathname()
  const [platform, setPlatform] = useState<Platform>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installing, setInstalling] = useState(false)
  const [showPasos, setShowPasos] = useState(false)
  const caja = useRef<HTMLDivElement | null>(null)

  // ── DÓNDE NO SALE, Y POR QUÉ ────────────────────────────
  //
  // Solo dentro de la app. Fuera —la portada y la página pública de un gooal,
  // `/g/<x>`— quien está mirando TODAVÍA NO SABE QUÉ ES GOOALS: llega de un
  // enlace de WhatsApp o de ningún sitio. Pedirle que lo instale antes de
  // contárselo es un anuncio; después de usarlo, es una oferta.
  //
  // Y en `/g/` hacía daño de verdad: en un móvil corto tapaba el título a
  // media palabra y dejaba fuera el único botón que tiene esa página,
  // «Guárdalo en tu lista».
  const dentroDeLaApp = conBarraInferior(pathname)

  useEffect(() => {
    if (!dentroDeLaApp) return
    try {
      if (localStorage.getItem(DISMISSED_KEY)) return
      if (isStandalone()) return

      // Cuándo toca ofrecerlo —segunda visita, o primer gooal conseguido— lo
      // decide `src/lib/instalar.ts`, que es donde también se marca el motivo.
      if (!tocaOfrecerInstalar()) return
    } catch {
      // Sin almacenamiento —modo privado— no se ofrece nada: es mejor no
      // enseñarlo que enseñarlo en cada carga sin poder recordar el «no».
      return
    }

    if (isSafariIOS()) {
      setPlatform('ios')
      return
    }

    if (isAndroidChrome()) {
      const handlePrompt = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e as BeforeInstallPromptEvent)
        setPlatform('android')
      }
      window.addEventListener('beforeinstallprompt', handlePrompt)
      return () => window.removeEventListener('beforeinstallprompt', handlePrompt)
    }
  }, [dentroDeLaApp])

  // ── QUE OCUPE SITIO, NO QUE FLOTE ENCIMA ─────────────────
  //
  // Sigue siendo `fixed` —así no se va con el scroll— pero publica su alto en
  // una variable de CSS que `AppShell` le descuenta al área de contenido. El
  // resultado es que empuja: lo de debajo se encoge en vez de esconderse.
  //
  // El alto se MIDE y no se escribe: en un móvil estrecho el título se parte en
  // dos líneas y el banner pasa de 75 a 95 px. Un número a mano acertaría en un
  // móvil y dejaría los demás tapados.
  useEffect(() => {
    const raiz = document.documentElement
    if (!platform || !caja.current) {
      raiz.style.removeProperty(VAR_ALTO)
      return
    }
    const medir = () => {
      const alto = caja.current?.getBoundingClientRect().height ?? 0
      raiz.style.setProperty(VAR_ALTO, `${Math.ceil(alto)}px`)
    }
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(caja.current)
    return () => {
      observador.disconnect()
      raiz.style.removeProperty(VAR_ALTO)
    }
  }, [platform])

  const dismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, '1') } catch { /* modo privado */ }
    setShowPasos(false)
    setPlatform(null)
  }

  const handleInstall = async () => {
    // En iOS no hay prompt nativo que disparar (Apple no implementa
    // beforeinstallprompt), así que el botón abre las instrucciones.
    if (platform === 'ios') {
      setShowPasos(true)
      return
    }

    if (!deferredPrompt) return
    setInstalling(true)
    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') dismiss()
    } catch (err) {
      console.error('[install] prompt failed:', err)
    } finally {
      setInstalling(false)
    }
  }

  if (!platform || !dentroDeLaApp) return null

  return (
    <>
      <div
        ref={caja}
        className="fixed left-0 right-0 z-40 bg-[#1E2120]"
        style={{
          // ENCIMA de la barra inferior, no sobre ella.
          //
          // Estaba en bottom: 0 y con una capa por encima de la barra (z-40
          // contra z-20), así que en las cuatro pestañas la tapaba entera: quien
          // no cerrara el banner no podía navegar. Un bloqueo total por un
          // número.
          bottom: `calc(${ALTO_NAV_TOTAL}px + env(safe-area-inset-bottom, 0px))`,
          borderTop: '1px solid #00D1A7',
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-9 h-9 rounded-xl bg-[#0B0B0B] border border-[#2A2E2C] flex items-center justify-center shrink-0">
            <span className="text-[#00D1A7] font-bold text-sm">G</span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#FFFFFF] leading-snug">
              Instala GooALS en tu móvil
            </p>
            <p className="text-[11px] text-[#7A8A85] leading-snug mt-0.5">
              {platform === 'ios'
                ? 'Desde Safari, en cuatro toques'
                : 'Acceso rápido desde tu pantalla de inicio'}
            </p>
          </div>

          <button
            onClick={handleInstall}
            disabled={installing}
            className="shrink-0 bg-[#00D1A7] active:bg-[#00B893] disabled:opacity-50 text-[#0B0B0B] text-xs font-semibold px-4 py-2.5 rounded-xl min-h-[44px] transition-colors"
          >
            {installing ? '...' : 'Instalar'}
          </button>

          <button
            onClick={dismiss}
            aria-label="No volver a mostrar"
            className="shrink-0 w-9 h-9 flex items-center justify-center text-[#7A8A85] active:text-[#FFFFFF] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showPasos && platform && (
        <InstallStepsSheet platform={platform} onClose={() => setShowPasos(false)} />
      )}
    </>
  )
}
