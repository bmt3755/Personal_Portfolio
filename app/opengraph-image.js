import { ImageResponse } from 'next/og'

export const alt = 'Manjeera Thogarcheti — AI & Systems Lead'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #1A1019 0%, #251726 55%, #1A1019 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '112px', fontWeight: 700, color: '#D79A4F', lineHeight: '1.05', display: 'flex' }}>
            Manjeera
          </div>
          <div style={{ fontSize: '112px', fontWeight: 300, color: '#AAA296', lineHeight: '1.05', display: 'flex' }}>
            Thogarcheti
          </div>
          <div style={{ width: '64px', height: '1px', background: '#D79A4F', margin: '28px 0', display: 'flex' }} />
          <div style={{ fontSize: '26px', color: '#7E7388', letterSpacing: '7px', display: 'flex' }}>
            AI &amp; SYSTEMS LEAD
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
