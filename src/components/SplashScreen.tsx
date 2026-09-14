'use client'

import { useState, useEffect } from 'react'

export default function SplashScreen() {
  const [phase, setPhase] = useState<'hidden' | 'visible' | 'fading'>('hidden')

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true

    if (!isStandalone) return

    const already = sessionStorage.getItem('splash-shown')
    if (already) return

    sessionStorage.setItem('splash-shown', '1')
    setPhase('visible')

    const fadeTimer = setTimeout(() => setPhase('fading'), 1300)
    const hideTimer = setTimeout(() => setPhase('hidden'), 1600)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  if (phase === 'hidden') return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#0B0B0B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.3s ease',
        opacity: phase === 'fading' ? 0 : 1,
        pointerEvents: 'none',
      }}
    >
      {/* width/height con la proporción del SVG (3828×723) para que no salte. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/marca/gooals-logotipo-oscuro.svg"
        alt="GooALS"
        width={169}
        height={32}
        style={{ height: 32, width: 'auto', display: 'block' }}
      />
    </div>
  )
}
