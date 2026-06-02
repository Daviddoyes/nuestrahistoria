'use client'

import { useRef, useState } from 'react'
import { ArrowUpRight, Share2 } from 'lucide-react'
import type { Plan } from '@/types/planes'

type Props = {
  planes: Plan[]
  nombre: string
  username: string | null
  fotoPerfil?: string | null
  compact?: boolean
}

export default function ShareBucketList({ planes, nombre, username, fotoPerfil, compact }: Props) {
  const templateRef = useRef<HTMLDivElement>(null)
  const avatarImgRef = useRef<HTMLImageElement>(null)
  const [generating, setGenerating] = useState(false)

  const top3 = planes.slice(0, 3)

  const handleShare = async () => {
    if (!templateRef.current) return
    setGenerating(true)
    try {
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
          // continue without photo
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
      {/* Hidden 1080×1920 template */}
      <div
        ref={templateRef}
        aria-hidden="true"
        style={{
          position: 'fixed', left: '-9999px', top: 0,
          width: 1080, height: 1920, background: '#0A0A0A',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '0 100px', boxSizing: 'border-box', overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(232,105,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(232,105,42,0.04) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: '#E8692A' }} />

        <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          {/* Profile photo circle */}
          {fotoPerfil ? (
            <img
              ref={avatarImgRef}
              src={fotoPerfil}
              alt=""
              style={{
                width: 120, height: 120, borderRadius: '50%', objectFit: 'cover',
                border: '4px solid #E8692A', marginBottom: 28,
              }}
            />
          ) : (
            <div style={{
              width: 120, height: 120, borderRadius: '50%', background: '#E8692A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 48, fontWeight: 700, color: '#fff', marginBottom: 28,
            }}>
              {nombre[0]?.toUpperCase() ?? '?'}
            </div>
          )}

          <p style={{ fontFamily: 'Georgia, serif', fontSize: 44, fontWeight: 700, color: '#F0F0F0', margin: 0, textAlign: 'center' }}>
            {nombre}
          </p>
          {username && (
            <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 28, color: '#555555', margin: 0, marginTop: 8, marginBottom: 60 }}>
              @{username}
            </p>
          )}

          <div style={{ width: '100%', height: 1, background: '#2A2A2A', marginBottom: 60 }} />

          <p style={{
            fontFamily: 'system-ui, sans-serif', fontSize: 20, fontWeight: 700,
            letterSpacing: '0.32em', color: '#E8692A', textTransform: 'uppercase',
            margin: 0, marginBottom: 56, textAlign: 'center',
          }}>
            MI BUCKET LIST
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 44, width: '100%' }}>
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
                  color: '#F0F0F0', lineHeight: 1.35, margin: 0, wordBreak: 'break-word',
                }}>
                  {plan.titulo}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p style={{
          position: 'absolute', bottom: 80,
          fontFamily: 'system-ui, sans-serif', fontSize: 24, fontWeight: 700,
          letterSpacing: '0.28em', color: '#E8692A', textTransform: 'uppercase',
        }}>
          LIVESTORY.APP
        </p>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: '#E8692A' }} />
      </div>

      {compact ? (
        <button
          onClick={handleShare}
          disabled={generating}
          className="flex items-center justify-center min-h-[44px] min-w-[44px] text-[#E8692A] active:text-[#D4581A] disabled:text-[#2A2A2A] disabled:cursor-not-allowed transition-colors"
          aria-label="Compartir bucket list"
        >
          {generating ? (
            <div className="w-4 h-4 border border-[#E8692A] border-t-transparent rounded-full animate-spin" />
          ) : (
            <ArrowUpRight className="w-5 h-5" />
          )}
        </button>
      ) : (
        <button
          onClick={handleShare}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2.5 border border-[#2A2A2A] rounded-xl text-sm text-[#F0F0F0] active:bg-[#1A1A1A] transition-colors disabled:opacity-40 min-h-[44px]"
        >
          <Share2 className="w-4 h-4 text-[#666666]" />
          {generating ? 'Generando...' : 'Compartir lista'}
        </button>
      )}
    </>
  )
}
