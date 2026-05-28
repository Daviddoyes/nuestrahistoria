'use client'

import { useRef, useState, useEffect } from 'react'
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
  const [imgDimensions, setImgDimensions] = useState({ width: 1000, height: 750 })

  useEffect(() => {
    if (!plan.foto_url) return
    const img = new Image()
    img.onload = () => setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    img.src = plan.foto_url
  }, [plan.foto_url])

  const ratio = imgDimensions.width / imgDimensions.height
  const marcoWidth = ratio > 1 ? 960 : ratio === 1 ? 900 : Math.round(1100 * ratio)
  const marcoHeight = ratio > 1 ? Math.round(960 / ratio) : ratio === 1 ? 900 : 1100

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
        {/* Blurred background — oversized to cover blur edges */}
        {photoSrc && (
          <img
            src={photoSrc}
            alt=""
            style={{
              position: 'absolute',
              top: '-10%',
              left: '-10%',
              width: '120%',
              height: '120%',
              objectFit: 'cover',
              filter: 'blur(28px)',
              transform: 'scale(1.2)',
            }}
          />
        )}

        {/* Dark overlay — also oversized to guarantee full coverage */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '120%', height: '120%', background: 'rgba(0,0,0,0.88)' }} />

        {/* Title — positioned above the photo center */}
        <div
          style={{
            position: 'absolute',
            bottom: `calc(50% + ${marcoHeight / 2}px + 80px)`,
            left: 60,
            right: 60,
            textAlign: 'center',
            fontFamily: 'Georgia, serif',
            fontSize: titleFontSize,
            fontWeight: 700,
            lineHeight: 1.3,
            letterSpacing: 0,
            wordBreak: 'break-word',
            whiteSpace: 'normal',
          } as React.CSSProperties}
        >
          <span style={{ display: 'inline', color: '#E8692A' }}>✓ </span>
          <span style={{ display: 'inline', color: '#FFFFFF' }}>{plan.titulo}</span>
        </div>

        {/* Photo — mathematically centered */}
        {photoSrc && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: marcoWidth,
              height: marcoHeight,
              border: '6px solid #E8692A',
              background: '#000',
              overflow: 'hidden',
            } as React.CSSProperties}
          >
            <img
              src={base64Url || plan.foto_url || ''}
              alt={plan.titulo}
              crossOrigin="anonymous"
              style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
            />
          </div>
        )}

        {/* Brand — positioned below the photo center */}
        <div
          style={{
            position: 'absolute',
            top: `calc(50% + ${marcoHeight / 2}px + 80px)`,
            left: 60,
            right: 60,
            textAlign: 'center',
            fontSize: 28,
            letterSpacing: '0.28em',
            color: '#E8692A',
            fontWeight: 700,
            textTransform: 'uppercase',
            fontFamily: 'system-ui, sans-serif',
          } as React.CSSProperties}
        >
          LIVESTORY.APP
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
