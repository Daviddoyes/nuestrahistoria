'use client'

import { useRef, useState } from 'react'
import { Share2 } from 'lucide-react'
import type { Plan } from '@/types/planes'

type Props = {
  plan: Plan
  descripcion: string
  compact?: boolean
}

export default function ShareStoryImage({ plan, descripcion, compact }: Props) {
  const templateRef = useRef<HTMLDivElement>(null)
  const [generating, setGenerating] = useState(false)

  const titulo = plan.titulo.length > 80 ? plan.titulo.slice(0, 80) + '…' : plan.titulo

  const handleShare = async () => {
    if (!templateRef.current) return
    setGenerating(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(templateRef.current, {
        useCORS: true,
        scale: 1,
        backgroundColor: '#0A0A0A',
        logging: false,
      })

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
      })

      const file = new File([blob], 'livestory-historia.png', { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: plan.titulo })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'livestory-historia.png'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('share error', err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <>
      {/* Hidden 1080×1920 template rendered off-screen for html2canvas */}
      <div
        ref={templateRef}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: 1080,
          height: 1920,
          background: '#0A0A0A',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        {/* Blurred background — same photo scaled to fill */}
        {plan.foto_url && (
          <img
            src={plan.foto_url}
            alt=""
            crossOrigin="anonymous"
            style={{
              position: 'absolute',
              top: '-5%',
              left: '-5%',
              width: '110%',
              height: '110%',
              objectFit: 'cover',
              filter: 'blur(28px)',
            }}
          />
        )}

        {/* Dark overlay 60% */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.62)',
          }}
        />

        {/* Main content — vertically centered */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '160px 80px 120px',
            gap: 52,
          }}
        >
          {/* Title above the frame */}
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 68,
              fontWeight: 700,
              color: '#FFFFFF',
              lineHeight: 1.2,
              textAlign: 'center',
              letterSpacing: '-0.01em',
              maxWidth: '100%',
              // Clamp to 3 lines
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            } as React.CSSProperties}
          >
            {titulo}
          </div>

          {/* Photo in white frame */}
          {plan.foto_url && (
            <div
              style={{
                border: '16px solid #FFFFFF',
                boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
                flexShrink: 0,
                maxWidth: '86%',    // 86% of 1080 = ~928px
                maxHeight: '55%',   // 55% of 1920 = 1056px
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#000',
              }}
            >
              <img
                src={plan.foto_url}
                alt={plan.titulo}
                crossOrigin="anonymous"
                style={{
                  display: 'block',
                  maxWidth: '928px',
                  maxHeight: '1056px',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                }}
              />
            </div>
          )}
        </div>

        {/* Brand — bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 72,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 22,
            letterSpacing: '0.32em',
            color: '#E8692A',
            fontWeight: 600,
            textTransform: 'uppercase',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          LIVESTORY.APP
        </div>
      </div>

      {/* Share button */}
      {compact ? (
        <button
          onClick={e => { e.stopPropagation(); handleShare() }}
          disabled={generating}
          aria-label={generating ? 'Generando imagen...' : 'Compartir historia'}
          className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center text-white/50 active:bg-[#E8692A]/80 active:text-white disabled:opacity-40 transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button
          onClick={handleShare}
          disabled={generating}
          className="flex items-center gap-2 text-sm text-[#666666] active:text-[#E8692A] disabled:opacity-40 transition-colors py-1"
        >
          <Share2 className="w-4 h-4" />
          {generating ? 'Generando imagen...' : 'Compartir historia'}
        </button>
      )}
    </>
  )
}
