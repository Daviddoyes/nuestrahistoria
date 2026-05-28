'use client'

import { useRef, useState } from 'react'
import { Share2 } from 'lucide-react'
import type { Plan } from '@/types/planes'

type Props = {
  plan: Plan
  descripcion: string
  compact?: boolean
}

const toBase64 = async (url: string): Promise<string> => {
  const response = await fetch('/api/proxy-image?url=' + encodeURIComponent(url))
  const blob = await response.blob()
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

export default function ShareStoryImage({ plan, descripcion, compact }: Props) {
  const templateRef = useRef<HTMLDivElement>(null)
  const [generating, setGenerating] = useState(false)
  const [base64Url, setBase64Url] = useState<string | null>(null)

  const len = plan.titulo.length
  const titleFontSize = len > 50 ? 36 : len > 35 ? 44 : len > 20 ? 54 : 64

  const handleShare = async () => {
    if (!templateRef.current) return
    setGenerating(true)
    try {
      let imgSrc = base64Url
      if (!imgSrc && plan.foto_url) {
        imgSrc = await toBase64(plan.foto_url)
        setBase64Url(imgSrc)
        // Allow React to re-render with base64Url before html2canvas reads the DOM
        await new Promise(r => setTimeout(r, 80))
      }

      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(templateRef.current, {
        useCORS: false,
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

  const photoSrc = base64Url ?? plan.foto_url

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
        {/* Blurred background — scale to ensure full coverage */}
        {photoSrc && (
          <img
            src={photoSrc}
            alt=""
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'blur(28px)',
              transform: 'scale(1.15)',
            }}
          />
        )}

        {/* Dark overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.88)' }} />

        {/* Main flex column — centered, equal gap title / photo / brand */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 60px',
            gap: 60,
            boxSizing: 'border-box',
          } as React.CSSProperties}
        >
          {/* Title */}
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: titleFontSize,
              fontWeight: 700,
              lineHeight: 1.3,
              textAlign: 'center',
              letterSpacing: '-0.01em',
              wordBreak: 'break-word',
              whiteSpace: 'normal',
              width: '100%',
            } as React.CSSProperties}
          >
            <span style={{ color: '#E8692A' }}>✓ </span>
            <span style={{ color: '#FFFFFF' }}>{plan.titulo}</span>
          </div>

          {/* Photo in orange frame */}
          {photoSrc && (
            <div
              style={{
                width: 960,
                maxHeight: 1000,
                border: '6px solid #E8692A',
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                background: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
                boxSizing: 'border-box',
              } as React.CSSProperties}
            >
              <img
                src={photoSrc}
                alt={plan.titulo}
                style={{
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  objectFit: 'contain',
                }}
              />
            </div>
          )}

          {/* Brand */}
          <div
            style={{
              textAlign: 'center',
              fontSize: 28,
              letterSpacing: '0.28em',
              color: '#E8692A',
              fontWeight: 700,
              textTransform: 'uppercase',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            LIVESTORY.APP
          </div>
        </div>
      </div>

      {/* Share button */}
      {compact ? (
        <button
          onClick={e => { e.stopPropagation(); handleShare() }}
          disabled={generating}
          aria-label={generating ? 'Preparando imagen...' : 'Compartir historia'}
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
          {generating ? 'Preparando imagen...' : 'Compartir historia'}
        </button>
      )}
    </>
  )
}
