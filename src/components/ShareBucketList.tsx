'use client'

import { useRef, useState } from 'react'
import { Share2 } from 'lucide-react'
import type { Plan } from '@/types/planes'

type Props = {
  planes: Plan[]
  nombre: string
  username: string | null
  fotoPerfil?: string | null
}

export default function ShareBucketList({ planes, nombre, username, fotoPerfil }: Props) {
  const templateRef = useRef<HTMLDivElement>(null)
  const avatarImgRef = useRef<HTMLImageElement>(null)
  const [generating, setGenerating] = useState(false)

  const top3 = planes.slice(0, 3)

  const handleShare = async () => {
    if (!templateRef.current) return
    setGenerating(true)
    try {
      // Load avatar via proxy so html2canvas can read it
      if (fotoPerfil && avatarImgRef.current) {
        try {
          const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(fotoPerfil)}`)
          if (res.ok) {
            const blob = await res.blob()
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result as string)
              reader.onerror = reject
              reader.readAsDataURL(blob)
            })
            avatarImgRef.current.src = base64
            await new Promise(resolve => {
              const img = avatarImgRef.current!
              if (img.complete && img.naturalWidth > 0) { resolve(undefined); return }
              img.onload = resolve
              img.onerror = resolve
            })
          }
        } catch {
          // ignore, render without photo
        }
      }

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
      {/* Hidden 1080×1920 template rendered off-screen for html2canvas */}
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
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '0 100px',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Subtle grid texture */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(232,105,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(232,105,42,0.04) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }} />
        {/* Top accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: '#E8692A' }} />

        <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Profile row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 80 }}>
            {fotoPerfil ? (
              <img
                ref={avatarImgRef}
                src={fotoPerfil}
                alt=""
                style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 80, height: 80, borderRadius: '50%', background: '#E8692A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {nombre[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 40, fontWeight: 700, color: '#F0F0F0', margin: 0, lineHeight: 1.2 }}>
                {nombre}
              </p>
              {username && (
                <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 28, color: '#555555', margin: 0, marginTop: 6 }}>
                  @{username}
                </p>
              )}
            </div>
          </div>

          {/* Section label */}
          <p style={{
            fontFamily: 'system-ui, sans-serif', fontSize: 22, fontWeight: 700,
            letterSpacing: '0.28em', color: '#E8692A', textTransform: 'uppercase',
            margin: 0, marginBottom: 56,
          }}>
            MI BUCKET LIST
          </p>

          {/* Top 3 plans numbered */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 44 }}>
            {top3.map((plan, i) => (
              <div key={plan.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 32 }}>
                <p style={{
                  fontFamily: 'system-ui, sans-serif', fontSize: 28, fontWeight: 700,
                  color: '#E8692A', margin: 0, lineHeight: 1.4, flexShrink: 0, width: 56,
                }}>
                  {String(i + 1).padStart(2, '0')}.
                </p>
                <p style={{
                  fontFamily: 'Georgia, serif', fontSize: 40, fontWeight: 600,
                  color: '#E0E0E0', lineHeight: 1.35, margin: 0, wordBreak: 'break-word',
                }}>
                  {plan.titulo}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Brand */}
        <p style={{
          position: 'absolute', bottom: 80,
          fontFamily: 'system-ui, sans-serif', fontSize: 26, fontWeight: 700,
          letterSpacing: '0.28em', color: '#E8692A', textTransform: 'uppercase',
        }}>
          LIVESTORY.APP
        </p>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: '#E8692A' }} />
      </div>

      {/* Visible button */}
      <button
        onClick={handleShare}
        disabled={generating}
        className="flex items-center gap-2 px-4 py-2.5 border border-[#2A2A2A] rounded-xl text-sm text-[#F0F0F0] active:bg-[#1A1A1A] transition-colors disabled:opacity-40 min-h-[44px]"
      >
        <Share2 className="w-4 h-4 text-[#666666]" />
        {generating ? 'Generando...' : 'Compartir lista'}
      </button>
    </>
  )
}
