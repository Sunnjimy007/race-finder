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
          backgroundColor: '#0D0D0D',
          fontFamily: 'sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Orange accent bar at top */}
        <div style={{ width: '100%', height: '8px', backgroundColor: '#FF4D00', display: 'flex' }} />

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, padding: '56px 64px 56px 64px' }}>
          {/* Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              backgroundColor: '#FF4D00',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: 'white', fontSize: '22px', fontWeight: 900 }}>R</span>
            </div>
            <span style={{ color: '#FFFFFF', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px' }}>
              RaceFinder
            </span>
          </div>

          {/* Main content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Distance pill */}
            {distance && (
              <div style={{
                display: 'flex',
                width: 'fit-content',
                backgroundColor: '#FF4D00',
                color: 'white',
                fontSize: '18px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '3px',
                padding: '8px 22px',
                borderRadius: '999px',
              }}>
                {distance}
              </div>
            )}

            {/* Race name */}
            <div style={{
              color: '#FFFFFF',
              fontSize: name.length > 40 ? '56px' : '68px',
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: '-2px',
            }}>
              {name.length > 55 ? name.slice(0, 52) + '…' : name}
            </div>
          </div>

          {/* Bottom details row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
            {dateFormatted && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '4px', height: '20px', backgroundColor: '#FF4D00', borderRadius: '2px', display: 'flex' }} />
                <span style={{ color: '#9BA3AF', fontSize: '20px', fontWeight: 500 }}>{dateFormatted}</span>
              </div>
            )}
            {location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '4px', height: '20px', backgroundColor: '#FF4D00', borderRadius: '2px', display: 'flex' }} />
                <span style={{ color: '#9BA3AF', fontSize: '20px', fontWeight: 500 }}>{location}</span>
              </div>
            )}
            {price && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '4px', height: '20px', backgroundColor: '#FF4D00', borderRadius: '2px', display: 'flex' }} />
                <span style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: 700 }}>{price}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
