'use client'

import { useRef, useState } from 'react'
import { Share2 } from 'lucide-react'
import type { Plan } from '@/types/planes'

type Props = {
  planes: Plan[]
  nombre: string
  username: string | null
  fotoPerfil?: string | null
  compact?: boolean
}

function planTitleSize(count: number) {
  if (count <= 2) return 48
  if (count === 3) return 40
  return 32
}

export default function ShareBucketList({ planes, nombre, username, fotoPerfil, compact }: Props) {
  const templateRef = useRef<HTMLDivElement>(null)
  const [generating, setGenerating] = useState(false)

  const top5 = planes.slice(0, 5)
  const titleSize = planTitleSize(top5.length)

  // unused props kept for API compatibility
  void nombre; void username; void fotoPerfil

  const handleShare = async () => {
    if (!templateRef.current) return
    setGenerating(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(templateRef.current, {
        useCORS: false,
        scale: 2,
        backgroundColor: '#0D0D0D',
        logging: false,
      })

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
      })

      const file = new File([blob], 'livestory-planes.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Mi lista de planes — Livestory' })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'livestory-planes.png'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('share bucket list error', err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <>
      {/* Hidden 1080×1920 template */}
      <div
        ref={templateRef}
        aria-hidden="true"
        style={{
          position: 'fixed', left: '-9999px', top: 0,
          width: 1080, height: 1920,
          background: 'linear-gradient(180deg, #0D0D0D 0%, #0A0A0A 100%)',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '100px 80px',
          boxSizing: 'border-box', overflow: 'hidden',
        }}
      >
        {/* ── TOP: brand + title ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
          <p style={{
            fontFamily: 'system-ui, sans-serif', fontSize: 16, fontWeight: 700,
            letterSpacing: '0.32em', color: '#E8692A', textTransform: 'uppercase',
            margin: 0,
          }}>
            LIVESTORY
          </p>
          <div style={{ width: '100%', height: 1, background: '#E8692A' }} />
          <p style={{
            fontFamily: 'Georgia, serif', fontSize: 76, fontWeight: 700,
            color: '#F0F0F0', margin: 0, lineHeight: 1.1, textAlign: 'center',
          }}>
            MY PLAN LIST
          </p>
        </div>

        {/* ── MIDDLE: plans ── */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          width: '100%',
        }}>
          {top5.map((plan, i) => (
            <div key={plan.id} style={{ width: '100%' }}>
              {i > 0 && (
                <div style={{ height: 1, background: '#2A2A2A', margin: '36px 0' }} />
              )}
              <p style={{
                fontFamily: 'Georgia, serif', fontSize: titleSize,
                fontWeight: 600, color: '#F0F0F0', lineHeight: 1.35,
                margin: 0, textAlign: 'center', wordBreak: 'break-word',
              }}>
                {plan.titulo}
              </p>
            </div>
          ))}
        </div>

        {/* ── BOTTOM: footer ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
          <div style={{ width: '100%', height: 1, background: '#E8692A' }} />
          <p style={{
            fontFamily: 'system-ui, sans-serif', fontSize: 20, fontWeight: 700,
            letterSpacing: '0.28em', color: '#E8692A', textTransform: 'uppercase',
            margin: 0,
          }}>
            LIVESTORY.APP
          </p>
        </div>
      </div>

      {compact ? (
        <button
          onClick={handleShare}
          disabled={generating || top5.length === 0}
          className="flex items-center justify-center min-h-[44px] min-w-[44px] text-[#E8692A] active:text-[#D4581A] disabled:text-[#2A2A2A] disabled:cursor-not-allowed transition-colors"
          aria-label="Compartir lista de planes"
        >
          {generating ? (
            <div className="w-4 h-4 border border-[#E8692A] border-t-transparent rounded-full animate-spin" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
        </button>
      ) : (
        <button
          onClick={handleShare}
          disabled={generating || top5.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 border border-[#2A2A2A] rounded-xl text-sm text-[#F0F0F0] active:bg-[#1A1A1A] transition-colors disabled:opacity-40 min-h-[44px]"
        >
          <Share2 className="w-4 h-4 text-[#666666]" />
          {generating ? 'Generando...' : 'Compartir lista'}
        </button>
      )}
    </>
  )
}
