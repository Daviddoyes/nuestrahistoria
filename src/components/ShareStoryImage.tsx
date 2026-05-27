'use client'

import { useRef, useState } from 'react'
import { Share2 } from 'lucide-react'
import type { Plan } from '@/types/planes'

type Props = {
  plan: Plan
  descripcion: string
}

function formatDate(dateStr: string | null, fallback: string) {
  const str = dateStr ?? fallback
  const date = new Date(str.includes('T') ? str : `${str}T12:00:00`)
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()
}

export default function ShareStoryImage({ plan, descripcion }: Props) {
  const templateRef = useRef<HTMLDivElement>(null)
  const [generating, setGenerating] = useState(false)

  const titulo = plan.titulo.length > 80 ? plan.titulo.slice(0, 80) + '…' : plan.titulo
  const desc = descripcion.length > 100 ? descripcion.slice(0, 100) + '…' : descripcion
  const dateStr = formatDate(plan.fecha_momento, plan.created_at)

  const handleShare = async () => {
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
      {/* Hidden template — rendered off-screen for html2canvas */}
      <div
        ref={templateRef}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: 540,
          height: 960,
          background: '#0A0A0A',
          overflow: 'hidden',
          fontFamily: 'system-ui, sans-serif',
        }}
        aria-hidden="true"
      >
        {/* Fullbleed photo */}
        {plan.foto_url && (
          <img
            src={plan.foto_url}
            alt=""
            crossOrigin="anonymous"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}

        {/* Gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to bottom, rgba(10,10,10,0.75) 0%, transparent 30%, transparent 45%, rgba(10,10,10,0.85) 70%, #0A0A0A 100%)',
          }}
        />

        {/* Brand top */}
        <div
          style={{
            position: 'absolute',
            top: 52,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 13,
            letterSpacing: '0.35em',
            color: '#E8692A',
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          LIVESTORY
        </div>

        {/* Bottom content */}
        <div
          style={{
            position: 'absolute',
            bottom: 72,
            left: 48,
            right: 48,
          }}
        >
          {/* Title */}
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 38,
              fontWeight: 700,
              color: '#F0F0F0',
              lineHeight: 1.2,
              marginBottom: 16,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
            } as React.CSSProperties}
          >
            {titulo}
          </div>

          {/* Description */}
          {desc && (
            <div
              style={{
                fontSize: 17,
                color: '#999999',
                lineHeight: 1.5,
                marginBottom: 20,
              }}
            >
              {desc}
            </div>
          )}

          {/* Date */}
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              color: '#555555',
              textTransform: 'uppercase',
            }}
          >
            {dateStr}
          </div>
        </div>
      </div>

      {/* Share button */}
      <button
        onClick={handleShare}
        disabled={generating}
        className="flex items-center gap-2 text-sm text-[#666666] active:text-[#E8692A] disabled:opacity-40 transition-colors py-1"
      >
        <Share2 className="w-4 h-4" />
        {generating ? 'Generando imagen...' : 'Compartir historia'}
      </button>
    </>
  )
}
