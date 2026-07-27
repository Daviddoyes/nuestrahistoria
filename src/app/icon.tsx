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
            color: '#1DE9B6',
            fontSize: 20,
            fontWeight: 700,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          G
        </span>
      </div>
    ),
    { ...size }
  )
}
