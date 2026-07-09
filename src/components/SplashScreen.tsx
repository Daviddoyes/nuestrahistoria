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
        background: '#0A0A0A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        transition: 'opacity 0.3s ease',
        opacity: phase === 'fading' ? 0 : 1,
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          color: '#E8692A',
          fontSize: 56,
          fontWeight: 700,
          fontFamily: 'var(--font-playfair), Georgia, serif',
          letterSpacing: '-0.02em',
        }}
      >
        LS
      </span>
      <span
        style={{
          color: '#333333',
          fontSize: 11,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}
      >
        LIVESTORY
      </span>
    </div>
  )
}
