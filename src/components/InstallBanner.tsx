'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { isSafariIOS, isAndroidChrome, isStandalone } from '@/lib/platform'
import InstallStepsSheet from './InstallStepsSheet'
import { ALTO_NAV_TOTAL, conBarraInferior } from './BottomNav'

type Platform = 'ios' | 'android' | null

type BeforeInstallPromptEvent = Event & {
  prompt: () => void
  userChoice: Promise<{ outcome: string }>
}

const DISMISSED_KEY = 'install-dismissed'

export default function InstallBanner() {
  const pathname = usePathname()
  const [platform, setPlatform] = useState<Platform>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installing, setInstalling] = useState(false)
  const [showPasos, setShowPasos] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return
    if (isStandalone()) return

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
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
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

  // /download ya es una landing de instalación entera: el banner encima sobra.
  if (!platform || pathname?.startsWith('/download')) return null

  const hayBarra = conBarraInferior(pathname)

  return (
    <>
      <div
        className="fixed left-0 right-0 z-40 bg-[#1E2120]"
        style={{
          // ENCIMA de la barra inferior, no sobre ella.
          //
          // Estaba en bottom: 0 y con una capa por encima de la barra (z-40
          // contra z-20), así que en las cuatro pestañas la tapaba entera: quien
          // no cerrara el banner no podía navegar. Un bloqueo total por un
          // número.
          //
          // El hueco de seguridad del móvil se lo deja a la barra cuando hay
          // barra: ella ya lo aplica, y sumarlo aquí también lo contaría dos
          // veces y dejaría el banner flotando.
          bottom: hayBarra ? `calc(${ALTO_NAV_TOTAL}px + env(safe-area-inset-bottom, 0px))` : 0,
          borderTop: '1px solid #00D1A7',
          paddingBottom: hayBarra ? 0 : 'env(safe-area-inset-bottom, 0px)',
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
