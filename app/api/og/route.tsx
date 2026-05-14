import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const name     = searchParams.get('name')     ?? 'Running Race'
  const date     = searchParams.get('date')     ?? ''
  const distance = searchParams.get('distance') ?? ''
  const location = searchParams.get('location') ?? ''
  const price    = searchParams.get('price')    ?? ''

  const dateFormatted = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#000000',
          padding: '64px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top: branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#FF4500', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', textTransform: 'uppercase' }}>
            Race
          </span>
          <span style={{ color: '#FFFFFC', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', textTransform: 'uppercase' }}>
            Finder
          </span>
        </div>

        {/* Middle: race name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Distance pill */}
          {distance && (
            <div
              style={{
                display: 'flex',
                width: 'fit-content',
                backgroundColor: '#FF4500',
                color: 'white',
                fontSize: '20px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '2px',
                padding: '8px 20px',
                borderRadius: '999px',
              }}
            >
              {distance}
            </div>
          )}
          <div style={{ color: '#FFFFFC', fontSize: '64px', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-2px' }}>
            {name.length > 50 ? name.slice(0, 47) + '…' : name}
          </div>
        </div>

        {/* Bottom: details row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {dateFormatted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#FF4500', fontSize: '22px' }}>📅</span>
              <span style={{ color: '#7A8EA6', fontSize: '22px' }}>{dateFormatted}</span>
            </div>
          )}
          {location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#FF4500', fontSize: '22px' }}>📍</span>
              <span style={{ color: '#7A8EA6', fontSize: '22px' }}>{location}</span>
            </div>
          )}
          {price && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#FF4500', fontSize: '22px' }}>💰</span>
              <span style={{ color: '#7A8EA6', fontSize: '22px' }}>{price}</span>
            </div>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
