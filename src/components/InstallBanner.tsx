'use client'

import { useState, useEffect } from 'react'
import { X, Share, SquarePlus, Check } from 'lucide-react'

type Platform = 'ios' | 'android' | null

type BeforeInstallPromptEvent = Event & {
  prompt: () => void
  userChoice: Promise<{ outcome: string }>
}

const DISMISSED_KEY = 'install-dismissed'

/** Azul de los controles de Safari en iOS: hace reconocibles los mocks. */
const IOS_BLUE = '#0A84FF'

function Paso({ n, texto, children }: { n: number; texto: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="shrink-0 flex items-center justify-center rounded-full bg-[#1DE9B6] text-[#0A0A0A] font-bold"
        style={{ width: 22, height: 22, fontSize: 11, marginTop: 2 }}
        aria-hidden
      >
        {n}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#F0F0F0] leading-snug">{texto}</p>
        <div className="mt-2">{children}</div>
      </div>
    </li>
  )
}

export default function InstallBanner() {
  const [platform, setPlatform] = useState<Platform>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installing, setInstalling] = useState(false)
  const [showPasos, setShowPasos] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return

    // Ya instalada: `standalone` es la variante propietaria de iOS, que no
    // soporta display-mode.
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
    if (isStandalone) return

    const ua = navigator.userAgent.toLowerCase()

    // iPadOS 13+ se anuncia como Macintosh; sin maxTouchPoints se quedaría
    // fuera y el iPad nunca vería el banner.
    const isIOSDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (/macintosh/.test(ua) && navigator.maxTouchPoints > 1)

    // Chrome/Firefox/Edge en iOS son WebKit por dentro, pero su menú compartir
    // no es el de Safari: las instrucciones de abajo no les valen.
    const isSafari = !/crios|fxios|edgios/.test(ua)
    const isAndroidChrome = /android/.test(ua) && /chrome/.test(ua)

    if (isIOSDevice && isSafari) {
      setPlatform('ios')
      return
    }

    if (isAndroidChrome) {
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

  if (!platform) return null

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
                ? 'Desde Safari, en dos toques'
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

      {/* ── Instrucciones de iOS ────────────────────────────── */}
      {showPasos && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60"
            onClick={() => setShowPasos(false)}
            aria-hidden
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="instalar-ios-titulo"
            className="fixed inset-x-0 bottom-0 z-[60] bg-[#0A0A0A] modal-slide-up"
            style={{
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              padding: '20px 24px',
              paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 id="instalar-ios-titulo" className="text-lg font-bold text-[#F0F0F0]">
                  Añadir a tu pantalla de inicio
                </h2>
                <p className="text-[13px] text-[#666666] mt-1 leading-relaxed">
                  iOS no permite instalar de un toque. Son tres.
                </p>
              </div>
              <button
                onClick={() => setShowPasos(false)}
                aria-label="Cerrar"
                className="w-9 h-9 -mr-2 flex items-center justify-center rounded-full text-[#555555] active:text-[#F0F0F0] transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="space-y-5">
              <Paso n={1} texto="Toca el botón compartir">
                {/* Mock de la barra inferior de Safari */}
                <div
                  className="flex items-center justify-center rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]"
                  style={{ height: 44, gap: 28 }}
                >
                  <span className="text-[#3A3A3A] text-lg leading-none" aria-hidden>‹</span>
                  <span className="text-[#3A3A3A] text-lg leading-none" aria-hidden>›</span>
                  <span
                    className="flex items-center justify-center rounded-lg"
                    style={{ width: 30, height: 30, background: 'rgba(10,132,255,0.15)', outline: `1.5px solid ${IOS_BLUE}` }}
                  >
                    <Share className="w-4 h-4" style={{ color: IOS_BLUE }} />
                  </span>
                  <span className="text-[#3A3A3A] text-lg leading-none" aria-hidden>□</span>
                </div>
                <p className="text-[11px] text-[#555555] mt-1.5">
                  Abajo del todo en Safari.
                </p>
              </Paso>

              <Paso
                n={2}
                texto={<>Desplázate y toca <span className="font-semibold">Añadir a pantalla de inicio</span></>}
              >
                {/* Mock de la fila del menú compartir */}
                <div
                  className="flex items-center justify-between rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3.5"
                  style={{ height: 44 }}
                >
                  <span className="text-[13px] text-[#F0F0F0]">Añadir a pantalla de inicio</span>
                  <SquarePlus className="w-4 h-4 text-[#F0F0F0] shrink-0" />
                </div>
              </Paso>

              <Paso n={3} texto={<>Toca <span className="font-semibold">Añadir</span></>}>
                {/* Mock del botón de confirmación, arriba a la derecha */}
                <div
                  className="flex items-center justify-end rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3.5"
                  style={{ height: 44 }}
                >
                  <span className="text-[13px] font-semibold" style={{ color: IOS_BLUE }}>Añadir</span>
                </div>
                <p className="text-[11px] text-[#555555] mt-1.5">
                  Arriba a la derecha. Ya lo tienes.
                </p>
              </Paso>
            </ol>

            <button
              type="button"
              onClick={() => setShowPasos(false)}
              className="w-full mt-6 py-3.5 rounded-xl bg-[#1DE9B6] active:bg-[#00BFA5] text-[#0A0A0A] text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2 transition-colors"
            >
              <Check className="w-4 h-4" />
              Entendido
            </button>
          </div>
        </>
      )}
    </>
  )
}
