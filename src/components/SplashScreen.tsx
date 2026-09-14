'use client'

import { useState, useEffect } from 'react'
import PantallaMarca from './PantallaMarca'

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

  return <PantallaMarca opacidad={phase === 'fading' ? 0 : 1} />
}
