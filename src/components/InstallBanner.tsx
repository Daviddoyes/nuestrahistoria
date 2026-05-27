'use client'

import { useState, useEffect } from 'react'
import { X, Share } from 'lucide-react'

type Platform = 'ios' | 'android' | null

export default function InstallBanner() {
  const [platform, setPlatform] = useState<Platform>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> } | null>(null)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // Don't show if already dismissed or already installed
    if (localStorage.getItem('install-dismissed')) return

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
    if (isStandalone) return

    const ua = navigator.userAgent.toLowerCase()
    const isIOS = /iphone|ipad|ipod/.test(ua) && !(window as { MSStream?: unknown }).MSStream
    const isAndroidChrome = /android/.test(ua) && /chrome/.test(ua)

    if (isIOS) {
      setPlatform('ios')
    } else if (isAndroidChrome) {
      const handlePrompt = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> })
        setPlatform('android')
      }
      window.addEventListener('beforeinstallprompt', handlePrompt)
      return () => window.removeEventListener('beforeinstallprompt', handlePrompt)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem('install-dismissed', '1')
    setPlatform(null)
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') dismiss()
    setInstalling(false)
  }

  if (!platform) return null

  return (
    <div
      className="fixed left-0 right-0 z-40 bg-[#141414] border-t border-[#2A2A2A]"
      style={{ bottom: 0, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icon */}
        <div className="w-9 h-9 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] flex items-center justify-center shrink-0">
          <span className="text-[#E8692A] font-bold text-sm font-serif">LS</span>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#F0F0F0] leading-snug">
            Instala Livestory
          </p>
          {platform === 'ios' ? (
            <p className="text-[10px] text-[#666666] leading-snug mt-0.5 flex items-center gap-1 flex-wrap">
              Toca <Share className="w-3 h-3 inline text-[#666666]" /> y luego{' '}
              <span className="text-[#F0F0F0]">Añadir a inicio</span>
            </p>
          ) : (
            <p className="text-[10px] text-[#666666] leading-snug mt-0.5">
              Acceso rápido desde tu pantalla de inicio
            </p>
          )}
        </div>

        {/* CTA */}
        {platform === 'android' && (
          <button
            onClick={handleInstall}
            disabled={installing}
            className="shrink-0 bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl"
          >
            {installing ? '...' : 'Instalar'}
          </button>
        )}

        {/* Close */}
        <button
          onClick={dismiss}
          aria-label="Cerrar"
          className="shrink-0 w-7 h-7 flex items-center justify-center text-[#444444] active:text-[#F0F0F0]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
