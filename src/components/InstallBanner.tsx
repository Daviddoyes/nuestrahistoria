'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { isSafariIOS, isAndroidChrome, isStandalone } from '@/lib/platform'
import InstallStepsSheet from './InstallStepsSheet'

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

  return (
    <>
      <div
        className="fixed left-0 right-0 z-40 bg-[#141414]"
        style={{
          bottom: 0,
          borderTop: '1px solid #1DE9B6',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-9 h-9 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] flex items-center justify-center shrink-0">
            <span className="text-[#1DE9B6] font-bold text-sm">G</span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#F0F0F0] leading-snug">
              Instala GooALS en tu móvil
            </p>
            <p className="text-[11px] text-[#666666] leading-snug mt-0.5">
              {platform === 'ios'
                ? 'Desde Safari, en cuatro toques'
                : 'Acceso rápido desde tu pantalla de inicio'}
            </p>
          </div>

          <button
            onClick={handleInstall}
            disabled={installing}
            className="shrink-0 bg-[#1DE9B6] active:bg-[#00BFA5] disabled:opacity-50 text-[#0A0A0A] text-xs font-semibold px-4 py-2.5 rounded-xl min-h-[44px] transition-colors"
          >
            {installing ? '...' : 'Instalar'}
          </button>

          <button
            onClick={dismiss}
            aria-label="No volver a mostrar"
            className="shrink-0 w-9 h-9 flex items-center justify-center text-[#444444] active:text-[#F0F0F0] transition-colors"
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
