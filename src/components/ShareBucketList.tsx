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

  const top5 = planes.slice(0, 5)
  const planTitleSize = top5.length <= 3 ? 32 : 26

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
          boxSizing: 'border-box', overflow: 'hidden',
        }}
      >
        {/* Top accent */}
        <div style={{ height: 6, background: '#E8692A', flexShrink: 0 }} />

        {/* Centered main content */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '60px 100px',
        }}>
          {/* Brand label */}
          <p style={{
            fontFamily: 'system-ui, sans-serif', fontSize: 16, fontWeight: 700,
            letterSpacing: '0.32em', color: '#E8692A', textTransform: 'uppercase',
            margin: 0, marginBottom: 44,
          }}>
            LIVESTORY
          </p>

          {/* Title */}
          <p style={{
            fontFamily: 'Georgia, serif', fontSize: 64, fontWeight: 700,
            color: '#F0F0F0', margin: 0, lineHeight: 1.1,
            textAlign: 'center', marginBottom: 40,
          }}>
            MY PLAN LIST
          </p>

          {/* Orange separator */}
          <div style={{ width: 60, height: 2, background: '#E8692A', marginBottom: 52 }} />

          {/* Profile row: photo + name side by side */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 28, marginBottom: 68,
          }}>
            {fotoPerfil ? (
              <img
                ref={avatarImgRef}
                src={fotoPerfil}
                alt=""
                style={{
                  width: 100, height: 100, borderRadius: '50%', objectFit: 'cover',
                  border: '3px solid #E8692A', flexShrink: 0,
                }}
              />
            ) : (
              <div style={{
                width: 100, height: 100, borderRadius: '50%', background: '#E8692A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 40, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {nombre[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div>
              <p style={{
                fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 700,
                color: '#F0F0F0', margin: 0, lineHeight: 1.2,
              }}>
                {nombre}
              </p>
              {username && (
                <p style={{
                  fontFamily: 'system-ui, sans-serif', fontSize: 22, color: '#555555',
                  margin: 0, marginTop: 6,
                }}>
                  @{username}
                </p>
              )}
            </div>
          </div>

          {/* Plans list */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
            {top5.map((plan, i) => (
              <div key={plan.id}>
                {i > 0 && (
                  <div style={{ height: 1, background: '#2A2A2A' }} />
                )}
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 24,
                  padding: '20px 0',
                }}>
                  <span style={{
                    fontFamily: 'system-ui, sans-serif', fontSize: planTitleSize,
                    color: '#E8692A', lineHeight: 1.35, flexShrink: 0,
                  }}>
                    ✦
                  </span>
                  <p style={{
                    fontFamily: 'Georgia, serif', fontSize: planTitleSize,
                    fontWeight: 600, color: '#F0F0F0', lineHeight: 1.35,
                    margin: 0, wordBreak: 'break-word',
                  }}>
                    {plan.titulo}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ width: '100%', height: 1, background: '#2A2A2A', marginTop: 52, marginBottom: 32 }} />
          <p style={{
            fontFamily: 'system-ui, sans-serif', fontSize: 18, fontWeight: 700,
            letterSpacing: '0.28em', color: '#E8692A', textTransform: 'uppercase',
            margin: 0,
          }}>
            LIVESTORY.APP
          </p>
        </div>

        {/* Bottom accent */}
        <div style={{ height: 6, background: '#E8692A', flexShrink: 0 }} />
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
            <ArrowUpRight className="w-5 h-5" />
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
