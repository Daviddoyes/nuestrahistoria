'use client'

import { useRef, useState } from 'react'
import { Share2 } from 'lucide-react'
import type { Plan } from '@/types/planes'

type Props = {
  plan: Plan
}

export default function SharePlanImage({ plan }: Props) {
  const templateRef = useRef<HTMLDivElement>(null)
  const [generating, setGenerating] = useState(false)

  const titulo = plan.titulo.length > 120 ? plan.titulo.slice(0, 120) + '…' : plan.titulo

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!templateRef.current) return
    setGenerating(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(templateRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#0A0A0A',
        logging: false,
      })

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
      })

      const file = new File([blob], 'mi-plan-livestory.png', { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: plan.titulo })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'mi-plan-livestory.png'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('share plan error', err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <>
      {/* Hidden template for html2canvas */}
      <div
        ref={templateRef}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: 540,
          height: 960,
          overflow: 'hidden',
          background: 'linear-gradient(to bottom, #0A0A0A 0%, #1A1A1A 100%)',
        }}
        aria-hidden="true"
      >
        {/* Subtle grid texture */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 40px)',
          }}
        />

        {/* Brand — top center */}
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 12,
            letterSpacing: '0.3em',
            color: '#E8692A',
            fontWeight: 700,
            textTransform: 'uppercase',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}
        >
          LIVESTORY
        </div>

        {/* Center block */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            transform: 'translateY(-50%)',
            padding: '0 56px',
          }}
        >
          {/* Top separator */}
          <div style={{ height: 1, background: '#2A2A2A', marginBottom: 48 }} />

          {/* Title */}
          <div
            style={{
              fontFamily: 'var(--font-playfair), Georgia, serif',
              fontSize: 62,
              fontWeight: 700,
              color: '#F0F0F0',
              lineHeight: 1.15,
              textAlign: 'center',
              marginBottom: 48,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
            } as React.CSSProperties}
          >
            {titulo}
          </div>

          {/* Bottom separator */}
          <div style={{ height: 1, background: '#2A2A2A', marginBottom: 28 }} />

          {/* Subtitle */}
          <div
            style={{
              textAlign: 'center',
              fontSize: 11,
              letterSpacing: '0.22em',
              color: '#666666',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
            }}
          >
            En mi bucket list
          </div>
        </div>

        {/* Bottom — domain */}
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 15,
            color: '#E8692A',
            letterSpacing: '0.08em',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}
        >
          livestory.app
        </div>
      </div>

      {/* Share button */}
      <button
        onClick={handleShare}
        disabled={generating}
        aria-label={generating ? 'Generando imagen...' : 'Compartir plan'}
        className="flex items-center gap-1 text-[10px] text-[#666666] active:text-[#E8692A] disabled:opacity-40 transition-colors shrink-0"
      >
        <Share2 className="w-3 h-3" />
        {generating ? 'Generando…' : ''}
      </button>
    </>
  )
}
