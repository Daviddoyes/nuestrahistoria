'use client'

import { useState, useEffect } from 'react'
import { Check, Smartphone } from 'lucide-react'
import { detectPlatform, isStandalone, type Platform } from '@/lib/platform'
import InstallStepsSheet from './InstallStepsSheet'

type BeforeInstallPromptEvent = Event & {
  prompt: () => void
  userChoice: Promise<{ outcome: string }>
}

const APP_URL = 'gooals.app'

/**
 * QR de https://gooals.app/download, generado una vez y embebido: sin librería
 * en el bundle ni petición a un servicio externo. Si cambia la URL hay que
 * regenerarlo.
 */
function QrCode({ size = 168 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 29 29"
      shapeRendering="crispEdges"
      width={size}
      height={size}
      role="img"
      aria-label="Código QR con el enlace gooals.app/download"
    >
      <path stroke="#F0F0F0" d="M0 0.5h7m2 0h1m2 0h1m2 0h6m1 0h7M0 1.5h1m5 0h1m4 0h2m4 0h1m2 0h1m1 0h1m5 0h1M0 2.5h1m1 0h3m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h3m1 0h1m1 0h3m1 0h1M0 3.5h1m1 0h3m1 0h1m1 0h4m4 0h2m2 0h1m1 0h1m1 0h3m1 0h1M0 4.5h1m1 0h3m1 0h1m1 0h1m1 0h2m1 0h3m1 0h4m1 0h1m1 0h3m1 0h1M0 5.5h1m5 0h1m1 0h1m1 0h1m1 0h5m3 0h1m1 0h1m5 0h1M0 6.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M8 7.5h1m1 0h2m1 0h1m1 0h1m2 0h3M0 8.5h1m1 0h5m3 0h1m1 0h1m1 0h2m1 0h1m1 0h1m2 0h5M4 9.5h1m2 0h2m2 0h1m3 0h10m3 0h1M0 10.5h1m2 0h1m1 0h2m2 0h2m6 0h1m4 0h3M0 11.5h2m5 0h1m3 0h1m2 0h1m1 0h1m3 0h2m2 0h2m1 0h1M3 12.5h2m1 0h1m2 0h1m6 0h2m7 0h2M3 13.5h1m6 0h2m1 0h3m2 0h3m1 0h3m3 0h1M0 14.5h2m4 0h1m1 0h9m1 0h1m1 0h2m1 0h1m1 0h2M1 15.5h3m1 0h1m2 0h3m2 0h1m1 0h1m3 0h2m1 0h2m3 0h1M1 16.5h2m1 0h3m1 0h3m1 0h1m1 0h2m1 0h1m1 0h1m1 0h1m3 0h2M0 17.5h1m6 0h1m2 0h3m2 0h2m1 0h2m1 0h4m1 0h1m1 0h1M0 18.5h1m2 0h2m1 0h3m2 0h1m10 0h2m2 0h1M0 19.5h1m1 0h1m1 0h2m1 0h1m2 0h1m1 0h1m1 0h1m1 0h1m1 0h1m2 0h3m3 0h1M0 20.5h1m2 0h5m1 0h3m4 0h1m1 0h1m1 0h5m1 0h3M8 21.5h1m1 0h2m1 0h3m1 0h4m3 0h5M0 22.5h7m2 0h1m1 0h1m1 0h5m1 0h2m1 0h1m1 0h3M0 23.5h1m5 0h1m1 0h2m3 0h1m1 0h1m1 0h4m3 0h1m3 0h1M0 24.5h1m1 0h3m1 0h1m1 0h2m2 0h1m1 0h2m4 0h5m1 0h3M0 25.5h1m1 0h3m1 0h1m1 0h5m2 0h2m1 0h1m6 0h2M0 26.5h1m1 0h3m1 0h1m1 0h1m9 0h1m2 0h7M0 27.5h1m5 0h1m3 0h1m1 0h1m3 0h1m2 0h3m1 0h1m1 0h1m1 0h1M0 28.5h7m1 0h1m1 0h1m3 0h1m1 0h1m1 0h2m3 0h2m1 0h1" />
    </svg>
  )
}

export default function DownloadLanding() {
  // `null` hasta que monta: en el servidor no hay navigator, y pintar el CTA
  // equivocado durante un instante se ve como un parpadeo.
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [instalada, setInstalada] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installing, setInstalling] = useState(false)
  const [showPasos, setShowPasos] = useState<'ios' | 'android' | null>(null)

  useEffect(() => {
    setPlatform(detectPlatform())
    setInstalada(isStandalone())

    const handlePrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handlePrompt)
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt)
  }, [])

  const handleInstall = async () => {
    if (platform === 'ios') {
      setShowPasos('ios')
      return
    }

    // Android sin prompt: o ya la tiene, o el navegador no lo ofrece todavía.
    // En cualquier caso las instrucciones manuales sí funcionan.
    if (!deferredPrompt) {
      setShowPasos('android')
      return
    }

    setInstalling(true)
    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setInstalada(true)
    } catch (err) {
      console.error('[download] prompt failed:', err)
      setShowPasos('android')
    } finally {
      setInstalling(false)
    }
  }

  const botonClase =
    'w-full py-4 bg-[#1DE9B6] active:bg-[#00BFA5] disabled:opacity-50 text-[#0A0A0A] text-[15px] font-semibold min-h-[44px] transition-colors'

  return (
    <main
      className="min-h-screen bg-[#0A0A0A] flex flex-col items-center px-6"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 56px)',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="w-full flex-1 flex flex-col items-center" style={{ maxWidth: 400 }}>
        {/* ── Header ──────────────────────────────────────── */}
        <p
          className="text-[#1DE9B6] font-semibold"
          style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase' }}
        >
          GooALS
        </p>

        <h1
          className="text-[#F0F0F0] text-center mt-7"
          style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.25 }}
        >
          Convierte tus intenciones en recuerdos.
        </h1>

        <p
          className="text-center mt-4"
          style={{ fontSize: 16, fontWeight: 400, color: '#999999', lineHeight: 1.6 }}
        >
          Crea tu bucket list, vívela y compártela.
        </p>

        {/* ── CTA por plataforma ──────────────────────────── */}
        <div className="w-full mt-10">
          {instalada ? (
            <div className="flex items-center justify-center gap-2.5 py-4 rounded-xl border border-[#1DE9B6]/30 bg-[#1DE9B6]/5">
              <Check className="w-4 h-4 text-[#1DE9B6] shrink-0" />
              <span className="text-sm text-[#F0F0F0]">Ya la tienes instalada</span>
            </div>
          ) : platform === null ? (
            // Placeholder de la misma altura: evita que la página salte al montar.
            <div className="w-full rounded-xl bg-[#141414]" style={{ height: 56 }} />
          ) : platform === 'ios' ? (
            <button onClick={handleInstall} className={`${botonClase} rounded-xl`}>
              Añadir a pantalla de inicio
            </button>
          ) : platform === 'android' ? (
            <button onClick={handleInstall} disabled={installing} className={`${botonClase} rounded-xl`}>
              {installing ? 'Instalando...' : 'Instalar GooALS'}
            </button>
          ) : (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2.5 text-center">
                <Smartphone className="w-4 h-4 text-[#1DE9B6] shrink-0" />
                <p className="text-sm text-[#F0F0F0] leading-snug">
                  Abre esta página en tu móvil para instalar la app
                </p>
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-[#141414] border border-[#2A2A2A]">
                <QrCode />
              </div>
              <p className="text-xs text-[#666666] mt-3">Escanea con la cámara</p>
            </div>
          )}
        </div>

        {/* ── Social proof ────────────────────────────────── */}
        <div className="w-full mt-12 flex flex-col items-center">
          <p className="text-[13px] text-[#999999] text-center">
            Únete a la comunidad que vive más.
          </p>

          <ul className="flex items-center justify-center gap-5 mt-5">
            {[
              { emoji: '📋', label: 'Planes' },
              { emoji: '📸', label: 'Historias' },
              { emoji: '🌍', label: 'Explorar' },
            ].map(({ emoji, label }) => (
              <li key={label} className="flex flex-col items-center gap-1.5">
                <span
                  className="flex items-center justify-center rounded-xl bg-[#141414] border border-[#2A2A2A]"
                  style={{ width: 44, height: 44, fontSize: 19 }}
                  aria-hidden
                >
                  {emoji}
                </span>
                <span className="text-[11px] text-[#666666]">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────── */}
      <p className="text-xs text-[#444444] mt-12">{APP_URL}</p>

      {showPasos && (
        <InstallStepsSheet platform={showPasos} onClose={() => setShowPasos(null)} />
      )}
    </main>
  )
}
