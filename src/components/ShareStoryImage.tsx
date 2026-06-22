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

const getImageDimensions = (src: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.src = src
  })

// Fixed layout constants
const CANVAS_W = 1080
const CANVAS_H = 1920
const MARCO_TOP = 400          // title lives above this
const MARCO_BOTTOM_GAP = 300   // brand lives below marco
const MARCO_MAX_W = 960        // max frame width
const MARCO_MAX_H = CANVAS_H - MARCO_TOP - MARCO_BOTTOM_GAP // 1220px

function calcMarco(ratio: number) {
  let w: number, h: number
  if (ratio > 1) {
    // Landscape
    w = MARCO_MAX_W
    h = Math.round(MARCO_MAX_W / ratio)
  } else {
    // Portrait or square — fit height first, cap width
    const hCandidate = MARCO_MAX_H
    const wCandidate = Math.round(hCandidate * ratio)
    if (wCandidate <= MARCO_MAX_W) {
      h = hCandidate
      w = wCandidate
    } else {
      w = MARCO_MAX_W
      h = Math.round(MARCO_MAX_W / ratio)
    }
  }
  const top = MARCO_TOP + Math.round((MARCO_MAX_H - h) / 2)
  const left = Math.round((CANVAS_W - w) / 2)
  return { w, h, top, left }
}

export default function ShareStoryImage({ plan, descripcion, compact }: Props) {
  const templateRef = useRef<HTMLDivElement>(null)
  const [generating, setGenerating] = useState(false)
  const [base64Url, setBase64Url] = useState<string | null>(null)
  const [imgDimensions, setImgDimensions] = useState({ width: 1000, height: 750 })

  const ratio = imgDimensions.width / imgDimensions.height
  const marco = calcMarco(ratio)

  const len = plan.titulo.length
  const titleFontSize = len > 60 ? 32 : len > 45 ? 38 : len > 30 ? 46 : len > 20 ? 54 : 64

  const handleShare = async () => {
    if (!templateRef.current) return
    setGenerating(true)
    try {
      if (plan.foto_url) {
        const imgSrc = await toBase64(plan.foto_url)
        setBase64Url(imgSrc)
        const dims = await getImageDimensions(imgSrc)
        setImgDimensions(dims)
        await new Promise(r => setTimeout(r, 400))
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

  return (
    <>
      {/* Hidden 1080×1920 template rendered off-screen for html2canvas */}
      <div
        ref={templateRef}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: CANVAS_W,
          height: CANVAS_H,
          background: '#0A0A0A',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        {/* LAYER 1 — Blurred background */}
        {base64Url && (
          <img
            src={base64Url}
            alt=""
            style={{
              position: 'absolute',
              top: '-10%',
              left: '-10%',
              width: '120%',
              height: '120%',
              objectFit: 'cover',
              filter: 'blur(30px)',
              transform: 'scale(1.1)',
            }}
          />
        )}

        {/* LAYER 2 — Dark overlay */}
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            left: '-10%',
            width: '120%',
            height: '120%',
            background: 'rgba(0,0,0,0.85)',
          }}
        />

        {/* LAYER 3 — Title, fixed at top: 180px */}
        <div
          style={{
            position: 'absolute',
            top: 180,
            left: 80,
            right: 80,
            textAlign: 'center',
            fontFamily: 'Georgia, serif',
            fontSize: titleFontSize,
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1.3,
            wordBreak: 'break-word',
            zIndex: 2,
          } as React.CSSProperties}
        >
          <span style={{ color: '#E8692A' }}>✓ </span>
          {plan.titulo}
        </div>

        {/* LAYER 4 — Photo frame, centred in available zone */}
        <div
          style={{
            position: 'absolute',
            top: marco.top,
            left: marco.left,
            width: marco.w,
            height: marco.h,
            border: '6px solid #E8692A',
            background: '#000',
            overflow: 'hidden',
            zIndex: 2,
          } as React.CSSProperties}
        >
          {base64Url && (
            <img
              src={base64Url}
              alt={plan.titulo}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: marco.w,
                height: marco.h,
              }}
            />
          )}
        </div>

        {/* LAYER 5 — Brand, fixed at bottom: 120px */}
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 24,
            letterSpacing: '0.3em',
            color: '#E8692A',
            fontWeight: 700,
            fontFamily: 'system-ui, sans-serif',
            textTransform: 'uppercase',
            zIndex: 2,
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
