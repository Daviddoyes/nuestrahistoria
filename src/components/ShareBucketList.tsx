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

const TITLE_SIZE: Record<number, number> = { 1: 36, 2: 32, 3: 30, 4: 28, 5: 26 }

export default function ShareBucketList({ planes, nombre, username, fotoPerfil, compact }: Props) {
  const templateRef = useRef<HTMLDivElement>(null)
  const avatarImgRef = useRef<HTMLImageElement>(null)
  const [generating, setGenerating] = useState(false)

  const top5 = planes.slice(0, 5)
  const titleSize = TITLE_SIZE[top5.length] ?? 26

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
          width: 1080, height: 1920, background: '#0A0A0A',
          display: 'flex', flexDirection: 'column',
          boxSizing: 'border-box', overflow: 'hidden',
        }}
      >
        {/* Top accent */}
        <div style={{ height: 6, background: '#E8692A', flexShrink: 0 }} />

        {/* Top section */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '72px 80px 0', flexShrink: 0,
        }}>
          <p style={{
            fontFamily: 'system-ui, sans-serif', fontSize: 18, fontWeight: 700,
            letterSpacing: '0.32em', color: '#E8692A', textTransform: 'uppercase',
            margin: 0, marginBottom: 48,
          }}>
            LIVESTORY
          </p>

          <div style={{ width: '100%', height: 1, background: '#2A2A2A', marginBottom: 64 }} />

          <p style={{
            fontFamily: 'Georgia, serif', fontSize: 52, fontWeight: 700,
            color: '#F0F0F0', margin: 0, lineHeight: 1.15, textAlign: 'center',
          }}>
            ESTA ES MI LISTA
          </p>
          <p style={{
            fontFamily: 'Georgia, serif', fontSize: 52, fontWeight: 700,
            color: '#F0F0F0', margin: 0, lineHeight: 1.15, textAlign: 'center',
            marginBottom: 60,
          }}>
            DE PLANES
          </p>

          {/* Profile photo */}
          {fotoPerfil ? (
            <img
              ref={avatarImgRef}
              src={fotoPerfil}
              alt=""
              style={{
                width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                border: '3px solid #E8692A', marginBottom: 20,
              }}
            />
          ) : (
            <div style={{
              width: 80, height: 80, borderRadius: '50%', background: '#E8692A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 700, color: '#fff', marginBottom: 20,
            }}>
              {nombre[0]?.toUpperCase() ?? '?'}
            </div>
          )}

          <p style={{
            fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 700,
            color: '#F0F0F0', margin: 0, textAlign: 'center',
          }}>
            {nombre}
          </p>
          {username && (
            <p style={{
              fontFamily: 'system-ui, sans-serif', fontSize: 20, color: '#555555',
              margin: 0, marginTop: 6, textAlign: 'center',
            }}>
              @{username}
            </p>
          )}
        </div>

        {/* Plans section */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '0 80px',
        }}>
          {top5.map((plan, i) => (
            <div key={plan.id}>
              {i > 0 && (
                <div style={{ height: 1, background: '#1A1A1A', margin: '0' }} />
              )}
              <div style={{
                display: 'flex', alignItems: 'stretch',
                padding: '36px 0',
              }}>
                <p style={{
                  fontFamily: 'monospace', fontSize: 18, fontWeight: 700,
                  color: '#E8692A', margin: 0, lineHeight: 1,
                  width: 60, flexShrink: 0,
                  display: 'flex', alignItems: 'center',
                }}>
                  {String(i + 1).padStart(2, '0')}
                </p>
                <div style={{ width: 1, background: '#2A2A2A', flexShrink: 0, marginRight: 32 }} />
                <p style={{
                  fontFamily: 'Georgia, serif', fontSize: titleSize,
                  fontWeight: 600, color: '#F0F0F0', lineHeight: 1.35,
                  margin: 0, wordBreak: 'break-word', flex: 1,
                }}>
                  {plan.titulo}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '0 80px', flexShrink: 0 }}>
          <div style={{ height: 1, background: '#2A2A2A', marginBottom: 40 }} />
          <p style={{
            fontFamily: 'system-ui, sans-serif', fontSize: 20, fontWeight: 700,
            letterSpacing: '0.28em', color: '#E8692A', textTransform: 'uppercase',
            margin: 0, marginBottom: 40, textAlign: 'center',
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
