'use client'

import { useRef, useState } from 'react'
import { Share2 } from 'lucide-react'
import type { Plan } from '@/types/planes'

type Props = {
  planes: Plan[]
  nombre: string
  username: string | null
}

export default function ShareBucketList({ planes, nombre, username }: Props) {
  const templateRef = useRef<HTMLDivElement>(null)
  const [generating, setGenerating] = useState(false)

  const top5 = planes.filter(p => p.estado === 'pendiente').slice(0, 5)

  const handleShare = async () => {
    if (!templateRef.current) return
    setGenerating(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(templateRef.current, {
        useCORS: false,
        scale: 2,
        backgroundColor: '#0A0A0A',
        logging: false,
      })

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
      })

      const file = new File([blob], 'livestory-bucketlist.png', { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Mi Bucket List — Livestory' })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'livestory-bucketlist.png'
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
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: 1080,
          height: 1920,
          background: '#0A0A0A',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 100px',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Subtle grid texture */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(232,105,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(232,105,42,0.04) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }} />

        {/* Orange top accent line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: '#E8692A' }} />

        <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Label */}
          <p style={{
            fontFamily: 'system-ui, sans-serif',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '0.28em',
            color: '#E8692A',
            textTransform: 'uppercase',
            marginBottom: 40,
          }}>
            MI BUCKET LIST
          </p>

          {/* User info */}
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 56, fontWeight: 700, color: '#F0F0F0', lineHeight: 1.1, margin: 0 }}>
            {nombre}
          </p>
          {username && (
            <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 28, color: '#555555', marginTop: 8, marginBottom: 80 }}>
              @{username}
            </p>
          )}

          {/* Plans list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {top5.map((plan, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 28 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: '2.5px solid #333333',
                  flexShrink: 0,
                  marginTop: 6,
                }} />
                <p style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: 38,
                  fontWeight: 600,
                  color: '#E0E0E0',
                  lineHeight: 1.3,
                  margin: 0,
                  wordBreak: 'break-word',
                }}>
                  {plan.titulo}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Brand */}
        <p style={{
          position: 'absolute',
          bottom: 80,
          fontFamily: 'system-ui, sans-serif',
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: '0.28em',
          color: '#E8692A',
          textTransform: 'uppercase',
        }}>
          LIVESTORY.APP
        </p>

        {/* Bottom accent line */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: '#E8692A' }} />
      </div>

      {/* Button */}
      <button
        onClick={handleShare}
        disabled={generating || top5.length === 0}
        className="flex items-center gap-1.5 text-xs font-medium text-[#666666] active:text-[#E8692A] disabled:opacity-40 transition-colors px-3 py-2 rounded-xl border border-[#2A2A2A] active:border-[#E8692A]"
      >
        <Share2 className="w-3.5 h-3.5" />
        {generating ? 'Generando...' : 'Compartir lista'}
      </button>
    </>
  )
}
