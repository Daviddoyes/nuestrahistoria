import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#0A0A0A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: '#E8692A',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          LS
        </span>
      </div>
    ),
    { ...size }
  )
}
